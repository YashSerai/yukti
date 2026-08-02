import { calendarTasks, emailTasks, type ImportedTask } from "../domain/task-signals";
import { ComposioClient } from "../providers/composio/client";
import type { RequestIdentity } from "./identity";

export type WorkspaceEnv = {
  DB: D1Database;
  YUKTI_APP_URL?: string;
  YUKTI_OWNER_GITHUB_LOGIN?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_USER_ID?: string;
  COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID?: string;
  COMPOSIO_GMAIL_AUTH_CONFIG_ID?: string;
};

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleWorkspaceRequest(request: Request, env: WorkspaceEnv, identity: RequestIdentity): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/workspace" && request.method === "GET") return json(await workspaceSnapshot(env, identity), 200);
  if (url.pathname === "/api/tasks" && request.method === "POST") return createTask(request, env.DB, identity.id);
  if (url.pathname === "/api/tasks/update" && request.method === "POST") return updateTask(request, env.DB, identity.id);
  if (url.pathname === "/api/connections/gmail" && request.method === "POST") return connectGmail(env, identity);
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
  let calendarConnected = false; let gmailConnected = false;
  if (env.COMPOSIO_API_KEY) {
    const client = new ComposioClient(env.COMPOSIO_API_KEY); const userId = composioUserId(env, identity);
    [calendarConnected, gmailConnected] = await Promise.all([
      client.calendarConnection(userId).then((v) => v.connected).catch(() => false),
      client.gmailConnection(userId).then((v) => v.connected).catch(() => false),
    ]);
  }
  return { tasks: tasks.results, purchases: purchases.results, connections: { calendarConnected, gmailConnected, syncs: syncs.results } };
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

async function connectGmail(env: WorkspaceEnv, identity: RequestIdentity) {
  if (!env.COMPOSIO_API_KEY || !env.COMPOSIO_GMAIL_AUTH_CONFIG_ID) return json({ error: "email_connection_unavailable" }, 503);
  const callbackUrl = `${env.YUKTI_APP_URL ?? "https://yukti.yashns.chatgpt.site"}/?email=returned`;
  try {
    const result = await new ComposioClient(env.COMPOSIO_API_KEY).createGmailLink(composioUserId(env, identity), env.COMPOSIO_GMAIL_AUTH_CONFIG_ID, callbackUrl);
    return json(result, 201);
  } catch { return json({ error: "email_connection_failed" }, 502); }
}

async function syncConnections(request: Request, env: WorkspaceEnv, identity: RequestIdentity) {
  if (!env.COMPOSIO_API_KEY) return json({ error: "connections_unavailable" }, 503);
  const body = await bodyJson(request); const provider = body.provider === "gmail" ? "gmail" : body.provider === "calendar" ? "calendar" : "all";
  const client = new ComposioClient(env.COMPOSIO_API_KEY); const composioId = composioUserId(env, identity); const now = new Date();
  const results: Record<string, unknown> = {};
  if (provider === "calendar" || provider === "all") {
    const connection = await client.calendarConnection(composioId);
    if (connection.connected) {
      const payload = await client.listCalendarEvents(composioId, connection.accountId, now.toISOString(), new Date(now.getTime() + 180 * 86_400_000).toISOString());
      const tasks = calendarTasks(payload); await upsertImported(env.DB, identity.id, tasks, "google_calendar", now.toISOString());
      await saveSync(env.DB, identity.id, "calendar", connection.accountId, now.toISOString(), null); results.calendar = tasks.length;
    } else results.calendar = "not_connected";
  }
  if (provider === "gmail" || provider === "all") {
    const connection = await client.gmailConnection(composioId);
    if (connection.connected) {
      const after = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
      const payload = await client.fetchRelevantEmails(composioId, connection.accountId, after);
      const tasks = emailTasks(payload, now); await upsertImported(env.DB, identity.id, tasks, "gmail", now.toISOString());
      await saveSync(env.DB, identity.id, "gmail", connection.accountId, now.toISOString(), null); results.gmail = tasks.length;
    } else results.gmail = "not_connected";
  }
  return json({ syncedAt: now.toISOString(), results }, 200);
}

async function upsertImported(db: D1Database, userId: string, tasks: ImportedTask[], source: string, now: string) {
  for (const task of tasks) {
    const existing = await db.prepare("SELECT event_id AS eventId FROM task_details WHERE user_id = ? AND external_id = ?").bind(userId, task.externalId).first<{ eventId: string }>();
    const id = existing?.eventId ?? crypto.randomUUID();
    if (existing) {
      await db.batch([
        db.prepare("UPDATE events SET title = ?, starts_at = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(task.title, task.startsAt, now, id, userId),
        db.prepare("UPDATE task_details SET kind = ?, description = ?, location = ?, source_url = ?, updated_at = ? WHERE event_id = ? AND user_id = ?").bind(task.kind, task.description ?? null, task.location ?? null, task.sourceUrl ?? null, now, id, userId),
      ]);
    } else {
      await db.batch([
        db.prepare("INSERT INTO events (id, user_id, person_id, title, starts_at, source, status, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, 'watching', ?, ?)").bind(id, userId, task.title, task.startsAt, source, now, now),
        db.prepare("INSERT INTO task_details (event_id, user_id, kind, description, action_state, required_question, answer, location, external_id, source_url, created_at, updated_at) VALUES (?, ?, ?, ?, 'watching', NULL, NULL, ?, ?, ?, ?, ?)").bind(id, userId, task.kind, task.description ?? null, task.location ?? null, task.externalId, task.sourceUrl ?? null, now, now),
      ]);
    }
  }
}

async function saveSync(db: D1Database, userId: string, provider: string, accountId: string, syncedAt: string, error: string | null) {
  const id = `${userId}:${provider}`;
  await db.prepare(`INSERT INTO connection_syncs (id, user_id, provider, connected_account_id, last_synced_at, last_error, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, provider) DO UPDATE SET connected_account_id = excluded.connected_account_id, last_synced_at = excluded.last_synced_at, last_error = excluded.last_error, updated_at = excluded.updated_at`)
    .bind(id, userId, provider, accountId, syncedAt, error, syncedAt, syncedAt).run();
}

function composioUserId(env: WorkspaceEnv, identity: RequestIdentity) {
  const owner = identity.login?.toLowerCase() === (env.YUKTI_OWNER_GITHUB_LOGIN ?? "YashSerai").toLowerCase();
  return owner ? env.COMPOSIO_USER_ID ?? "yukti-owner" : `yukti-${identity.id}`;
}
async function bodyJson(request: Request): Promise<Record<string, unknown>> { try { const v = await request.json(); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; } }
function string(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function date(value: unknown) { const v = string(value, 80); return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : ""; }
function allowedKind(value: unknown) { return ["gift", "occasion", "appointment", "admin", "calendar", "email"].includes(String(value)) ? String(value) : "admin"; }
function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers }); }
