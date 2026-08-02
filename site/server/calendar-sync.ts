import { calendarTasks, type ImportedTask } from "../domain/task-signals";
import { ComposioClient } from "../providers/composio/client";
import { GeminiFlashClient, type CalendarPreparation } from "../providers/gemini/client";

export type CalendarSyncEnv = {
  DB: D1Database;
  YUKTI_OWNER_GITHUB_LOGIN?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_USER_ID?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

export type CalendarSyncIdentity = { id: string; login?: string };

const MAX_ENRICHMENTS_PER_SYNC = 12;

export async function syncCalendarForUser(env: CalendarSyncEnv, identity: CalendarSyncIdentity, at = new Date()) {
  if (!env.COMPOSIO_API_KEY) throw new Error("Calendar connection is unavailable");
  const client = new ComposioClient(env.COMPOSIO_API_KEY);
  const composioId = composioUserId(env, identity);
  const connection = await client.calendarConnection(composioId);
  if (!connection.connected) return { connected: false, imported: 0, enriched: 0, enrichmentFailed: 0 };

  const now = at.toISOString();
  try {
    const payload = await client.listCalendarEvents(composioId, connection.accountId, now, new Date(at.getTime() + 180 * 86_400_000).toISOString());
    const tasks = calendarTasks(payload);
    const result = await upsertCalendarTasks(env, identity.id, tasks, now);
    await saveCalendarSync(env.DB, identity.id, connection.accountId, now, null);
    return { connected: true, imported: tasks.length, ...result };
  } catch (error) {
    const message = safeError(error);
    await saveCalendarSync(env.DB, identity.id, connection.accountId, null, message);
    throw new Error(message);
  }
}

export function composioUserId(env: Pick<CalendarSyncEnv, "YUKTI_OWNER_GITHUB_LOGIN" | "COMPOSIO_USER_ID">, identity: CalendarSyncIdentity) {
  const owner = identity.login?.toLowerCase() === (env.YUKTI_OWNER_GITHUB_LOGIN ?? "YashSerai").toLowerCase();
  return owner ? env.COMPOSIO_USER_ID ?? "yukti-owner" : `yukti-${identity.id}`;
}

async function upsertCalendarTasks(env: CalendarSyncEnv, userId: string, tasks: ImportedTask[], now: string) {
  const gemini = env.GEMINI_API_KEY ? new GeminiFlashClient(env.GEMINI_API_KEY, env.GEMINI_MODEL) : null;
  let enriched = 0; let enrichmentFailed = 0; let enrichmentAttempts = 0;
  for (const task of tasks) {
    const existing = await env.DB.prepare(`SELECT event_id AS eventId, enrichment_fingerprint AS fingerprint,
      required_question AS requiredQuestion, answer FROM task_details WHERE user_id = ? AND external_id = ?`)
      .bind(userId, task.externalId).first<{ eventId: string; fingerprint: string | null; requiredQuestion: string | null; answer: string | null }>();
    const id = existing?.eventId ?? crypto.randomUUID();
    const fingerprint = await taskFingerprint(task);
    let preparation: CalendarPreparation | null = null;
    const needsEnrichment = existing?.fingerprint !== fingerprint;
    if (needsEnrichment && gemini && enrichmentAttempts < MAX_ENRICHMENTS_PER_SYNC) {
      enrichmentAttempts++;
      try { preparation = await gemini.prepareCalendarEvent(task); enriched++; }
      catch { enrichmentFailed++; }
    }

    if (existing) {
      const questionChanged = preparation?.question !== undefined && preparation.question !== existing.requiredQuestion;
      const question = preparation ? preparation.question : existing.requiredQuestion;
      const answer = questionChanged ? null : existing.answer;
      const state = question && !answer ? "needs_answer" : "watching";
      await env.DB.batch([
        env.DB.prepare("UPDATE events SET title = ?, starts_at = ?, status = CASE WHEN status IN ('completed', 'dismissed') THEN status ELSE ? END, updated_at = ? WHERE id = ? AND user_id = ?")
          .bind(task.title, task.startsAt, state, now, id, userId),
        env.DB.prepare(`UPDATE task_details SET kind = ?, description = COALESCE(?, description, ?), source_description = ?,
          action_state = CASE WHEN action_state IN ('completed', 'dismissed') THEN action_state ELSE ? END,
          required_question = ?, answer = ?, location = ?, source_url = ?, enrichment_fingerprint = COALESCE(?, enrichment_fingerprint),
          enriched_at = COALESCE(?, enriched_at), updated_at = ? WHERE event_id = ? AND user_id = ?`)
          .bind(task.kind, preparation?.note ?? null, task.description ?? fallbackNote(task), task.description ?? null,
            state, question, answer, task.location ?? null, task.sourceUrl ?? null, preparation ? fingerprint : null,
            preparation?.generatedAt ?? null, now, id, userId),
      ]);
    } else {
      const note = preparation?.note ?? task.description ?? fallbackNote(task);
      const question = preparation?.question ?? null;
      const state = question ? "needs_answer" : "watching";
      await env.DB.batch([
        env.DB.prepare("INSERT INTO events (id, user_id, person_id, title, starts_at, source, status, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, 'google_calendar', ?, ?, ?)")
          .bind(id, userId, task.title, task.startsAt, state, now, now),
        env.DB.prepare(`INSERT INTO task_details (event_id, user_id, kind, description, action_state, required_question, answer,
          location, external_id, source_url, source_description, enrichment_fingerprint, enriched_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(id, userId, task.kind, note, state, question, task.location ?? null, task.externalId, task.sourceUrl ?? null,
            task.description ?? null, preparation ? fingerprint : null, preparation?.generatedAt ?? null, now, now),
      ]);
    }
  }
  return { enriched, enrichmentFailed };
}

async function saveCalendarSync(db: D1Database, userId: string, accountId: string, syncedAt: string | null, error: string | null) {
  const now = new Date().toISOString(); const id = `${userId}:calendar`;
  await db.prepare(`INSERT INTO connection_syncs (id, user_id, provider, connected_account_id, last_synced_at, last_error, created_at, updated_at)
    VALUES (?, ?, 'calendar', ?, ?, ?, ?, ?) ON CONFLICT(user_id, provider) DO UPDATE SET
    connected_account_id = excluded.connected_account_id, last_synced_at = COALESCE(excluded.last_synced_at, connection_syncs.last_synced_at),
    last_error = excluded.last_error, updated_at = excluded.updated_at`)
    .bind(id, userId, accountId, syncedAt, error, now, now).run();
}

async function taskFingerprint(task: ImportedTask) {
  const value = JSON.stringify([task.title, task.startsAt, task.description ?? "", task.location ?? "", task.kind]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fallbackNote(task: ImportedTask) {
  if (task.kind === "admin") return "Review the event details and check the relevant official instructions before the date.";
  if (task.kind === "appointment") return "Review the appointment details and any preparation instructions from the provider.";
  if (task.kind === "occasion") return "Review what you already know about the occasion and decide whether anything needs preparing.";
  return "Review the event details and decide what needs preparing before it starts.";
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "Calendar sync failed").replace(/AIza[\w-]+/g, "[redacted]").slice(0, 180);
}
