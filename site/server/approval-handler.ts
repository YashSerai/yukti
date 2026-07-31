import { PravaClient, PravaRequestError, PravaResponseError } from "../providers/prava/client";
import { redact } from "../lib/redaction";
import { identityFromRequest } from "./identity";

type RuntimeEnv = {
  DB: D1Database;
  YUKTI_MODE?: string;
  YUKTI_APP_URL?: string;
  PRAVA_SECRET_KEY?: string;
};

type CandidateRow = {
  candidate_id: string;
  event_id: string;
  merchant: string;
  title: string;
  amount_minor: number;
  currency: string;
  url: string;
};

type ApprovalRow = {
  approval_id: string;
  user_id: string;
  candidate_id: string;
  event_id: string;
  merchant: string;
  title: string;
  amount_minor: number;
  currency: string;
  url: string;
  expires_at: string;
  consumed_at: string | null;
};

type TransactionRow = { transaction_id: string; prava_session_id: string | null; state: string };

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleYuktiApi(request: Request, env: RuntimeEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  if (request.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const identity = await identityFromRequest(request, env.YUKTI_MODE);
  if (!identity) return reply({ error: "authentication_required" }, 401);

  if (url.pathname === "/api/approvals") return createApproval(request, env.DB, identity);
  if (url.pathname === "/api/prava/sessions") return createPravaSession(request, env, identity);
  if (url.pathname === "/api/prava/sessions/revoke") return revokePravaSession(request, env, identity.id);
  return reply({ error: "not_found" }, 404);
}

async function createApproval(request: Request, db: D1Database, identity: { id: string; displayName: string }) {
  const body = await readBody(request);
  const candidateSlug = typeof body?.candidateId === "string" ? body.candidateId : "";
  if (!/^cand-(tea|book)$/.test(candidateSlug)) return reply({ error: "unknown_candidate" }, 400);

  await seedJudgeData(db, identity);
  const candidateId = scoped(identity.id, candidateSlug);
  const candidate = await db.prepare(`
    SELECT c.id AS candidate_id, e.id AS event_id, c.merchant, c.title, c.amount_minor, c.currency, c.url
    FROM candidates c
    JOIN preparation_plans p ON p.id = c.plan_id
    JOIN events e ON e.id = p.event_id
    WHERE c.id = ? AND e.user_id = ?
  `).bind(candidateId, identity.id).first<CandidateRow>();
  if (!candidate) return reply({ error: "candidate_not_owned" }, 404);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60_000).toISOString();
  const approvalId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO approvals
      (id, user_id, event_id, candidate_id, merchant, amount_minor, currency, expires_at, consumed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`)
      .bind(approvalId, identity.id, candidate.event_id, candidate.candidate_id, candidate.merchant, candidate.amount_minor, candidate.currency, expiresAt, now.toISOString(), now.toISOString()),
    db.prepare(`INSERT INTO audit_events (id, user_id, event_id, kind, detail, created_at, updated_at)
      VALUES (?, ?, ?, 'approval.created', ?, ?, ?)`)
      .bind(auditId, identity.id, candidate.event_id, JSON.stringify({ approvalId, candidateId: candidate.candidate_id, amountMinor: candidate.amount_minor, currency: candidate.currency }), now.toISOString(), now.toISOString()),
  ]);

  return reply({ approval: { id: approvalId, candidateId: candidateSlug, eventId: "evt-sarah", merchant: candidate.merchant,
    amountMinor: candidate.amount_minor, currency: candidate.currency, expiresAt } }, 201);
}

async function createPravaSession(request: Request, env: RuntimeEnv, identity: { id: string; email: string }) {
  if (env.YUKTI_MODE !== "sandbox") return reply({ error: "prava_sandbox_not_enabled" }, 409);
  if (!env.PRAVA_SECRET_KEY?.startsWith("sk_test_")) return reply({ error: "prava_sandbox_not_configured" }, 503);

  const body = await readBody(request);
  const approvalId = typeof body?.approvalId === "string" ? body.approvalId : "";
  if (!approvalId) return reply({ error: "approval_required" }, 400);
  const approval = await env.DB.prepare(`
    SELECT a.id AS approval_id, a.user_id, a.expires_at, a.consumed_at,
      a.candidate_id, a.event_id, a.merchant, a.amount_minor, a.currency, c.title, c.url
    FROM approvals a
    JOIN candidates c ON c.id = a.candidate_id
    JOIN preparation_plans p ON p.id = c.plan_id
    JOIN events e ON e.id = p.event_id
    WHERE a.id = ? AND a.user_id = ?
  `).bind(approvalId, identity.id).first<ApprovalRow>();
  if (!approval) return reply({ error: "approval_not_found" }, 404);
  if (approval.consumed_at) return reply({ error: "approval_consumed" }, 409);
  if (Date.parse(approval.expires_at) <= Date.now()) return reply({ error: "approval_expired" }, 409);

  const now = new Date().toISOString();
  const transactionId = crypto.randomUUID();
  const consume = await env.DB.prepare(`UPDATE approvals SET consumed_at = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND consumed_at IS NULL AND expires_at > ?`)
    .bind(now, now, approvalId, identity.id, now).run();
  if ((consume.meta.changes ?? 0) !== 1) return reply({ error: "approval_unavailable" }, 409);
  await env.DB.prepare(`INSERT INTO transactions
    (id, approval_id, prava_session_id, merchant_reference, state, failure_code, created_at, updated_at)
    VALUES (?, ?, NULL, NULL, 'approved', NULL, ?, ?)`)
    .bind(transactionId, approvalId, now, now).run();

  try {
    const prava = new PravaClient(env.PRAVA_SECRET_KEY);
    const session = await prava.createSession({
      userId: identity.id,
      userEmail: identity.email,
      currency: approval.currency,
      merchant: { name: approval.merchant, url: approval.url, countryCode: "CA" },
      item: { id: transactionId, description: approval.title, amountMinor: approval.amount_minor, quantity: 1 },
      callbackUrl: env.YUKTI_APP_URL ? `${env.YUKTI_APP_URL}/?payment=returned` : undefined,
    });
    await env.DB.prepare(`UPDATE transactions SET prava_session_id = ?, state = 'purchasing', updated_at = ? WHERE id = ?`)
      .bind(session.sessionId, new Date().toISOString(), transactionId).run();
    return reply({ transactionId, checkoutUrl: session.iframeUrl, expiresAt: session.expiresAt }, 201);
  } catch (error) {
    const providerCode = error instanceof PravaRequestError ? error.code
      : error instanceof PravaResponseError ? `INVALID_RESPONSE_${error.issue.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`
      : "NETWORK_OR_RUNTIME_ERROR";
    await env.DB.prepare(`UPDATE transactions SET state = 'failed', failure_code = ?, updated_at = ? WHERE id = ?`)
      .bind(`prava_${providerCode.toLowerCase()}`, new Date().toISOString(), transactionId).run();
    return reply({ error: "prava_session_create_failed", providerCode,
      ...(providerCode === "NETWORK_OR_RUNTIME_ERROR" && error instanceof Error
        ? { runtimeReason: String(redact(error.message)).slice(0, 160) }
        : {}),
      ...(error instanceof PravaRequestError && error.responseId ? { responseId: error.responseId } : {}) }, 502);
  }
}

async function revokePravaSession(request: Request, env: RuntimeEnv, userId: string) {
  if (env.YUKTI_MODE !== "sandbox") return reply({ error: "prava_sandbox_not_enabled" }, 409);
  if (!env.PRAVA_SECRET_KEY?.startsWith("sk_test_")) return reply({ error: "prava_sandbox_not_configured" }, 503);
  const body = await readBody(request);
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : "";
  if (!transactionId) return reply({ error: "transaction_required" }, 400);
  const transaction = await env.DB.prepare(`
    SELECT t.id AS transaction_id, t.prava_session_id, t.state
    FROM transactions t JOIN approvals a ON a.id = t.approval_id
    WHERE t.id = ? AND a.user_id = ?
  `).bind(transactionId, userId).first<TransactionRow>();
  if (!transaction?.prava_session_id) return reply({ error: "prava_session_not_found" }, 404);
  if (transaction.state !== "purchasing") return reply({ error: "transaction_not_revocable" }, 409);
  try {
    await new PravaClient(env.PRAVA_SECRET_KEY).revokeSession(transaction.prava_session_id);
    await env.DB.prepare(`UPDATE transactions SET state = 'failed', failure_code = 'revoked_by_user', updated_at = ? WHERE id = ? AND state = 'purchasing'`)
      .bind(new Date().toISOString(), transactionId).run();
    return reply({ transactionId, state: "revoked" }, 200);
  } catch (error) {
    const providerCode = error instanceof PravaRequestError ? error.code
      : error instanceof Error ? String(redact(error.message)).slice(0, 120)
      : "UNKNOWN";
    return reply({ error: "prava_revoke_failed", providerCode }, 502);
  }
}

async function seedJudgeData(db: D1Database, identity: { id: string; displayName: string }) {
  const now = new Date().toISOString();
  const eventId = scoped(identity.id, "evt-sarah");
  const personId = scoped(identity.id, "person-sarah");
  const planId = scoped(identity.id, "plan-sarah");
  const rows: Array<[string, unknown[]]> = [
    ["INSERT OR IGNORE INTO users (id, chatgpt_user_id, display_name, timezone, created_at, updated_at) VALUES (?, ?, ?, 'America/Vancouver', ?, ?)", [identity.id, identity.id, identity.displayName, now, now]],
    ["INSERT OR IGNORE INTO people (id, user_id, name, relationship, notes, created_at, updated_at) VALUES (?, ?, 'Sarah', 'Friend', 'Seeded judge fixture', ?, ?)", [personId, identity.id, now, now]],
    ["INSERT OR IGNORE INTO events (id, user_id, person_id, title, starts_at, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'seeded_fixture', 'ready_for_approval', ?, ?)", [eventId, identity.id, personId, "Sarah's birthday dinner", "2026-08-09T19:00:00-07:00", now, now]],
    ["INSERT OR IGNORE INTO preparation_plans (id, event_id, state, deadline_at, summary, created_at, updated_at) VALUES (?, ?, 'ready_for_approval', ?, 'Choose one useful birthday gift.', ?, ?)", [planId, eventId, "2026-08-02T23:59:00-07:00", now, now]],
    ["INSERT OR IGNORE INTO candidates (id, plan_id, merchant, title, amount_minor, currency, url, evidence, created_at, updated_at) VALUES (?, ?, 'Granville Tea Co.', 'Jasmine tea tasting set', 4200, 'CAD', 'https://example.com/yukti-sandbox/tea', 'Seeded memory fixture', ?, ?)", [scoped(identity.id, "cand-tea"), planId, now, now]],
    ["INSERT OR IGNORE INTO candidates (id, plan_id, merchant, title, amount_minor, currency, url, evidence, created_at, updated_at) VALUES (?, ?, 'Paper Hound', 'The Art of Still Life', 3800, 'CAD', 'https://example.com/yukti-sandbox/book', 'Seeded memory fixture', ?, ?)", [scoped(identity.id, "cand-book"), planId, now, now]],
  ];
  await db.batch(rows.map(([sql, values]) => db.prepare(sql).bind(...values)));
}

function scoped(userId: string, id: string) {
  return `${userId}:${id}`;
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function reply(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}
