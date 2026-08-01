import { PravaClient, PravaRequestError, PravaResponseError } from "../providers/prava/client";
import { redact } from "../lib/redaction";
import { GeminiFlashClient } from "../providers/gemini/client";
import { SensoClient } from "../providers/senso/client";
import { LinqClient } from "../providers/linq/client";
import { ComposioClient } from "../providers/composio/client";
import { identityFromRequest } from "./identity";
import { beginGitHubLogin, finishGitHubLogin, logoutGitHub, sha256 } from "./github-auth";
import { consumeRateLimit, guardProviderUse, RateLimitError, requireSameOrigin } from "./rate-limit";
import { handleConciergeRequest, handleLinqWebhook } from "./concierge-handler";

type RuntimeEnv = {
  DB: D1Database;
  YUKTI_MODE?: string;
  YUKTI_APP_URL?: string;
  PRAVA_SECRET_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  SENSO_API_KEY?: string;
  LINQ_API_TOKEN?: string;
  LINQ_PHONE_NUMBER?: string;
  LINQ_OWNER_PHONE?: string;
  LINQ_WEBHOOK_SECRET?: string;
  YUKTI_OWNER_GITHUB_LOGIN?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_USER_ID?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_CALLBACK_URL?: string;
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

type TransactionRow = { transaction_id: string; prava_session_id: string | null; state: string; event_id?: string };

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleYuktiApi(request: Request, env: RuntimeEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  try {
    if (url.pathname === "/api/auth/github/start" && request.method === "GET") {
      const actor = await sha256(request.headers.get("cf-connecting-ip") || "unknown");
      await consumeRateLimit(env.DB, "github-login", actor, 10, 60 * 60_000);
      return beginGitHubLogin(request, env);
    }
    if (url.pathname === "/api/auth/github/callback" && request.method === "GET") return finishGitHubLogin(request, env);
    if (url.pathname === "/api/me" && request.method === "GET") {
      const identity = await identityFromRequest(request, env.DB, env.YUKTI_MODE);
      return identity ? reply({ user: { login: identity.login, displayName: identity.displayName } }, 200) : reply({ error: "authentication_required" }, 401);
    }
    if (url.pathname === "/api/webhooks/linq" && request.method === "POST") return handleLinqWebhook(request, env);
    if (request.method !== "POST" && request.method !== "GET") return reply({ error: "method_not_allowed" }, 405);
    if (request.method === "POST") {
      const originError = requireSameOrigin(request, env.YUKTI_MODE);
      if (originError) return originError;
    }
    if (url.pathname === "/api/auth/logout") return logoutGitHub(request, env.DB);

    const identity = await identityFromRequest(request, env.DB, env.YUKTI_MODE);
    if (!identity) return reply({ error: "authentication_required" }, 401);
    const conciergeResponse = await handleConciergeRequest(request, env, identity);
    if (conciergeResponse) return conciergeResponse;
    if (request.method !== "POST") return reply({ error: "not_found" }, 404);
    if (url.pathname === "/api/approvals") {
      await consumeRateLimit(env.DB, "approval", identity.id, 20, 60 * 60_000);
      return createApproval(request, env.DB, identity);
    }
    if (url.pathname === "/api/prepare") {
      await guardProviderUse(env.DB, "prepare", identity.id);
      return prepareWithGemini(env, identity);
    }
    if (url.pathname === "/api/status") {
      await consumeRateLimit(env.DB, "status", identity.id, 6, 10 * 60_000);
      await consumeRateLimit(env.DB, "status:global", "all", 60, 10 * 60_000);
      return providerStatus(env);
    }
    if (url.pathname === "/api/prava/sessions") {
      await guardProviderUse(env.DB, "prava", identity.id);
      return createPravaSession(request, env, identity);
    }
    if (url.pathname === "/api/prava/sessions/revoke") {
      await consumeRateLimit(env.DB, "prava-revoke", identity.id, 10, 60 * 60_000);
      return revokePravaSession(request, env, identity.id);
    }
    if (url.pathname === "/api/prava/sessions/verify") {
      await consumeRateLimit(env.DB, "prava-verify", identity.id, 20, 60 * 60_000);
      return verifyPravaSession(request, env, identity.id);
    }
    return reply({ error: "not_found" }, 404);
  } catch (error) {
    if (error instanceof RateLimitError) return reply({ error: "rate_limited", retryAfterSeconds: error.retryAfterSeconds }, 429, { "retry-after": String(error.retryAfterSeconds) });
    return reply({ error: "request_failed" }, 500);
  }
}

async function providerStatus(env: RuntimeEnv) {
  const linq = env.LINQ_API_TOKEN && env.LINQ_PHONE_NUMBER
    ? await safeCheck(() => new LinqClient(env.LINQ_API_TOKEN!, env.LINQ_PHONE_NUMBER!).health())
    : { ok: false as const, reason: "not_configured" };
  const composio = env.COMPOSIO_API_KEY
    ? await safeCheck(() => new ComposioClient(env.COMPOSIO_API_KEY!).calendarConnection(env.COMPOSIO_USER_ID ?? "yukti-owner"))
    : { ok: false as const, reason: "not_configured" };

  return reply({
    checkedAt: new Date().toISOString(),
    providers: {
      prava: { state: env.PRAVA_SECRET_KEY?.startsWith("sk_test_") ? "sandbox_ready" : "not_configured" },
      senso: { state: env.SENSO_API_KEY ? "configured" : "not_configured" },
      gemini: { state: env.GEMINI_API_KEY && /gemini-[\w.-]*flash[\w.-]*$/i.test(env.GEMINI_MODEL ?? "gemini-3.6-flash") ? "flash_ready" : "not_configured", model: env.GEMINI_MODEL ?? "gemini-3.6-flash" },
      linq: linq.ok ? { state: linq.value.configured ? "healthy" : "not_configured", detail: linq.value.status } : { state: "unavailable" },
      composio: composio.ok && composio.value.connected ? { state: "connected" } : { state: "disconnected", detail: "Calendar consent not granted" },
    },
  }, 200);
}

async function safeCheck<T>(check: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  try { return { ok: true, value: await check() }; }
  catch { return { ok: false, reason: "provider_unavailable" }; }
}

async function prepareWithGemini(env: RuntimeEnv, identity: { id: string; displayName: string }) {
  if (!env.GEMINI_API_KEY) return reply({ error: "gemini_not_configured" }, 503);
  if (!env.SENSO_API_KEY) return reply({ error: "senso_not_configured" }, 503);
  await seedJudgeData(env.DB, identity);
  try {
    const memories = await new SensoClient(env.SENSO_API_KEY).searchMemory("What gift preferences and activities are known about Sarah?");
    if (memories.length === 0) return reply({ error: "senso_memory_not_found" }, 404);
    const brief = await new GeminiFlashClient(env.GEMINI_API_KEY, env.GEMINI_MODEL ?? "gemini-3.6-flash").prepareBirthdayBrief(memories.map((memory) => memory.text).join("\n\n"));
    const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO audit_events (id, user_id, event_id, kind, detail, created_at, updated_at)
      VALUES (?, ?, ?, 'preparation.generated', ?, ?, ?)`)
      .bind(crypto.randomUUID(), identity.id, scoped(identity.id, "evt-sarah"), JSON.stringify({ model: brief.model, usage: brief.usage, sensoContentIds: memories.map((memory) => memory.contentId) }), now, now).run();
    return reply({ brief, memorySource: { provider: "senso", title: memories[0].title, score: memories[0].score } }, 200);
  } catch (error) {
    return reply({ error: "gemini_preparation_failed",
      ...(error instanceof Error ? { reason: String(redact(error.message)).slice(0, 160) } : {}) }, 502);
  }
}

async function createApproval(request: Request, db: D1Database, identity: { id: string; displayName: string }) {
  const body = await readBody(request);
  await seedJudgeData(db, identity);
  let candidateSlug = typeof body?.candidateId === "string" ? body.candidateId : "";
  let candidateId: string;
  const productSnapshotId = typeof body?.productSnapshotId === "string" ? body.productSnapshotId : "";
  if (productSnapshotId) {
    const snapshot = await db.prepare(`SELECT s.id, s.merchant, s.title, s.amount_minor, s.currency, s.url, s.evidence, s.retrieved_at, r.maximum_amount_minor, r.person_id, p.name AS person_name
      FROM product_snapshots s JOIN proactive_rules r ON r.id = s.rule_id JOIN people p ON p.id = r.person_id
      WHERE s.id = ? AND s.user_id = ? AND r.user_id = ?`).bind(productSnapshotId, identity.id, identity.id)
      .first<{ id: string; merchant: string; title: string; amount_minor: number; currency: string; url: string; evidence: string; retrieved_at: string; maximum_amount_minor: number; person_id: string; person_name: string }>();
    if (!snapshot) return reply({ error: "product_snapshot_not_found" }, 404);
    if (snapshot.amount_minor > snapshot.maximum_amount_minor) return reply({ error: "product_over_budget" }, 409);
    if (Date.parse(snapshot.retrieved_at) < Date.now() - 24 * 60 * 60_000) return reply({ error: "product_snapshot_stale" }, 409);
    let productEvidence: { deliveryLocation?: string; groundedResearch?: { citations?: Array<{ url?: string }> } };
    try { productEvidence = JSON.parse(snapshot.evidence); } catch { return reply({ error: "product_research_incomplete" }, 409); }
    const citations = productEvidence.groundedResearch?.citations ?? [];
    if (!productEvidence.deliveryLocation || !citations.some((item) => typeof item.url === "string" && /^https:\/\//.test(item.url))) {
      return reply({ error: "product_research_incomplete" }, 409);
    }
    candidateSlug = `live-${snapshot.id}`;
    candidateId = scoped(identity.id, candidateSlug);
    const now = new Date().toISOString();
    const liveEventId = scoped(identity.id, `evt-live-${snapshot.id}`);
    const livePlanId = scoped(identity.id, `plan-live-${snapshot.id}`);
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO events (id, user_id, person_id, title, starts_at, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'proactive_rule', 'ready_for_approval', ?, ?)`)
        .bind(liveEventId, identity.id, snapshot.person_id, `${snapshot.person_name} flower reminder`, now, now, now),
      db.prepare(`INSERT OR IGNORE INTO preparation_plans (id, event_id, state, deadline_at, summary, created_at, updated_at) VALUES (?, ?, 'ready_for_approval', NULL, ?, ?, ?)`)
        .bind(livePlanId, liveEventId, `Current flowers for ${snapshot.person_name}`, now, now),
    ]);
    await db.prepare(`INSERT OR IGNORE INTO candidates (id, plan_id, merchant, title, amount_minor, currency, url, evidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(candidateId, livePlanId, snapshot.merchant, snapshot.title, snapshot.amount_minor, snapshot.currency, snapshot.url, snapshot.evidence, now, now).run();
  } else {
    if (!/^cand-(tea|book)$/.test(candidateSlug)) return reply({ error: "unknown_candidate" }, 400);
    candidateId = scoped(identity.id, candidateSlug);
  }
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

  return reply({ approval: { id: approvalId, candidateId: candidateSlug, eventId: candidate.event_id, merchant: candidate.merchant,
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
      callbackUrl: env.YUKTI_APP_URL ? `${env.YUKTI_APP_URL}/?payment=returned&transaction=${encodeURIComponent(transactionId)}` : undefined,
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

async function verifyPravaSession(request: Request, env: RuntimeEnv, userId: string) {
  if (env.YUKTI_MODE !== "sandbox") return reply({ error: "prava_sandbox_not_enabled" }, 409);
  if (!env.PRAVA_SECRET_KEY?.startsWith("sk_test_")) return reply({ error: "prava_sandbox_not_configured" }, 503);
  const body = await readBody(request);
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!transactionId && !sessionId) return reply({ error: "transaction_or_session_required" }, 400);
  const transaction = await env.DB.prepare(`
    SELECT t.id AS transaction_id, t.prava_session_id, t.state, a.event_id
    FROM transactions t JOIN approvals a ON a.id = t.approval_id
    WHERE (t.id = ? OR t.prava_session_id = ?) AND a.user_id = ?
  `).bind(transactionId, sessionId, userId).first<TransactionRow>();
  if (!transaction?.prava_session_id) return reply({ error: "prava_session_not_found" }, 404);
  if (transaction.state !== "purchasing") return reply({ transactionId: transaction.transaction_id, state: transaction.state, scopedCredentialsReceived: false }, 200);

  try {
    const result = await new PravaClient(env.PRAVA_SECRET_KEY).executeAwaitingPayment(
      transaction.prava_session_id,
      async () => ({ status: "DECLINED", responseCode: "05", amountPaid: "0.00" }),
    );
    if (result.state === "pending") {
      return reply({ transactionId: transaction.transaction_id, state: "pending", scopedCredentialsReceived: false }, 202);
    }

    const now = new Date().toISOString();
    const scopedCredentialsReceived = Boolean(result.reference);
    const state = result.state === "completed" ? "completed" : "sandbox_declined";
    await env.DB.batch([
      env.DB.prepare(`UPDATE transactions SET state = ?, merchant_reference = ?, failure_code = ?, updated_at = ? WHERE id = ? AND state = 'purchasing'`)
        .bind(result.state, result.reference ?? null, result.state === "failed" ? "sandbox_test_card_declined" : null, now, transaction.transaction_id),
      env.DB.prepare(`INSERT INTO audit_events (id, user_id, event_id, kind, detail, created_at, updated_at)
        VALUES (?, ?, ?, 'payment.sandbox_result', ?, ?, ?)`)
        .bind(crypto.randomUUID(), userId, transaction.event_id ?? null, JSON.stringify({ transactionId: transaction.transaction_id, state, scopedCredentialsReceived, providerConfirmation: result.networkConfirmation ?? null }), now, now),
    ]);
    return reply({ transactionId: transaction.transaction_id, state, scopedCredentialsReceived, providerConfirmation: result.networkConfirmation }, 200);
  } catch (error) {
    const providerCode = error instanceof PravaRequestError ? error.code
      : error instanceof PravaResponseError ? `INVALID_RESPONSE_${error.issue.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`
      : "NETWORK_OR_RUNTIME_ERROR";
    return reply({ error: "prava_result_check_failed", providerCode,
      ...(error instanceof PravaRequestError && error.responseId ? { responseId: error.responseId } : {}) }, 502);
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

function reply(body: unknown, status: number, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extraHeaders } });
}
