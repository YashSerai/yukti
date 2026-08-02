import { ComposioClient } from "../providers/composio/client";
import { composioUserId, syncCalendarForUser } from "./calendar-sync";
import type { RequestIdentity } from "./identity";

export type WorkspaceEnv = {
  DB: D1Database;
  YUKTI_APP_URL?: string;
  YUKTI_OWNER_GITHUB_LOGIN?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_USER_ID?: string;
  COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleWorkspaceRequest(request: Request, env: WorkspaceEnv, identity: RequestIdentity): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/workspace" && request.method === "GET") return json(await workspaceSnapshot(env, identity), 200);
  if (url.pathname === "/api/tasks" && request.method === "POST") return createTask(request, env.DB, identity.id);
  if (url.pathname === "/api/tasks/update" && request.method === "POST") return updateTask(request, env.DB, identity.id);
  if (url.pathname === "/api/connections/sync" && request.method === "POST") return syncConnections(request, env, identity);
  return null;
}

async function workspaceSnapshot(env: WorkspaceEnv, identity: RequestIdentity) {
  const [tasks, purchases, syncs] = await Promise.all([
    env.DB.prepare(`SELECT e.id, e.title, e.starts_at AS startsAt, e.source, e.status, p.name AS personName,
      d.kind, d.description, d.action_state AS actionState, d.required_question AS requiredQuestion,
      d.answer, d.location, d.source_url AS sourceUrl, d.updated_at AS updatedAt
      FROM events e LEFT JOIN people p ON p.id = e.person_id LEFT JOIN task_details d ON d.event_id = e.id
      WHERE e.user_id = ? ORDER BY CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END, e.starts_at ASC LIMIT 100`).bind(identity.id).all(),
    env.DB.prepare(`SELECT a.id, a.merchant, a.amount_minor AS amountMinor, a.currency, a.expires_at AS expiresAt,
      a.consumed_at AS consumedAt, c.title, e.title AS eventTitle, t.id AS transactionId, t.state AS transactionState,
      t.failure_code AS failureCode, t.merchant_reference AS merchantReference, t.updated_at AS updatedAt
      FROM approvals a JOIN candidates c ON c.id = a.candidate_id JOIN events e ON e.id = a.event_id
      LEFT JOIN transactions t ON t.approval_id = a.id WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 50`).bind(identity.id).all(),
    env.DB.prepare(`SELECT provider, connected_account_id AS connectedAccountId, last_synced_at AS lastSyncedAt, last_error AS lastError FROM connection_syncs WHERE user_id = ?`).bind(identity.id).all(),
  ]);
  let calendarConnected = false;
  if (env.COMPOSIO_API_KEY) {
    const client = new ComposioClient(env.COMPOSIO_API_KEY); const userId = composioUserId(env, identity);
    calendarConnected = await client.calendarConnection(userId).then((v) => v.connected).catch(() => false);
  }
  return { tasks: tasks.results, purchases: purchases.results, connections: { calendarConnected, syncs: syncs.results } };
}

async function createTask(request: Request, db: D1Database, userId: string) {
  const body = await bodyJson(request); const title = string(body.title, 100); const startsAt = date(body.startsAt);
  const kind = allowedKind(body.kind); const description = string(body.description, 500) || null;
  if (!title || !startsAt) return json({ error: "title_and_date_required" }, 400);
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const question = string(body.requiredQuestion, 180) || null; const state = question ? "needs_answer" : "watching";
  await db.batch([
    db.prepare(`INSERT INTO events (id, user_id, person_id, title, starts_at, source, status, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, 'manual', ?, ?, ?)`).bind(id, userId, title, startsAt, state, now, now),
    db.prepare(`INSERT INTO task_details (event_id, user_id, kind, description, action_state, required_question, answer, location, external_id, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`).bind(id, userId, kind, description, state, question, now, now),
  ]);
  return json({ id, created: true }, 201);
}

async function updateTask(request: Request, db: D1Database, userId: string) {
  const body = await bodyJson(request); const id = string(body.id, 100); if (!id) return json({ error: "task_required" }, 400);
  const task = await db.prepare("SELECT e.id FROM events e WHERE e.id = ? AND e.user_id = ?").bind(id, userId).first();
  if (!task) return json({ error: "task_not_found" }, 404);
  const now = new Date().toISOString();
  if (typeof body.answer === "string") {
    const answer = string(body.answer, 500); if (!answer) return json({ error: "answer_required" }, 400);
    await db.batch([
      db.prepare(`UPDATE task_details SET answer = ?, action_state = 'watching', updated_at = ? WHERE event_id = ? AND user_id = ?`).bind(answer, now, id, userId),
      db.prepare(`UPDATE events SET status = 'watching', updated_at = ? WHERE id = ? AND user_id = ?`).bind(now, id, userId),
    ]);
  } else {
    const state = ["watching", "dismissed", "completed"].includes(String(body.state)) ? String(body.state) : "";
    if (!state) return json({ error: "valid_state_required" }, 400);
    await db.batch([
      db.prepare(`UPDATE task_details SET action_state = ?, updated_at = ? WHERE event_id = ? AND user_id = ?`).bind(state, now, id, userId),
      db.prepare(`UPDATE events SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(state, now, id, userId),
    ]);
  }
  return json({ saved: true }, 200);
}

async function syncConnections(request: Request, env: WorkspaceEnv, identity: RequestIdentity) {
  if (!env.COMPOSIO_API_KEY) return json({ error: "connections_unavailable" }, 503);
  const now = new Date();
  try {
    const result = await syncCalendarForUser(env, identity, now);
    return json({ syncedAt: now.toISOString(), results: { calendar: result.connected ? result : "not_connected" } }, 200);
  } catch (error) {
    return json({ error: "calendar_sync_failed", detail: error instanceof Error ? error.message : "Calendar sync failed" }, 502);
  }
}
async function bodyJson(request: Request): Promise<Record<string, unknown>> { try { const v = await request.json(); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; } }
function string(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function date(value: unknown) { const v = string(value, 80); return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : ""; }
function allowedKind(value: unknown) { return ["gift", "occasion", "appointment", "admin", "calendar", "email"].includes(String(value)) ? String(value) : "admin"; }
function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers }); }
