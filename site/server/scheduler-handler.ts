import { prepareDueFlowerRule, type ConciergeEnv } from "./concierge-handler";
import { syncCalendarForUser, type CalendarSyncEnv } from "./calendar-sync";
import { sha256 } from "./github-auth";

type SchedulerEnv = ConciergeEnv & CalendarSyncEnv & { YUKTI_SCHEDULER_SECRET?: string };
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleScheduledJob(request: Request, env: SchedulerEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/jobs/proactive") return null;
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!env.YUKTI_SCHEDULER_SECRET || !token || await sha256(token) !== await sha256(env.YUKTI_SCHEDULER_SECRET)) return json({ error: "unauthorized" }, 401);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const now = new Date(); const nowIso = now.toISOString(); const day = nowIso.slice(0, 10);
  const calendarCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const calendars = await env.DB.prepare(`SELECT c.user_id AS userId, g.login
    FROM connection_syncs c LEFT JOIN github_identities g ON g.user_id = c.user_id
    WHERE c.provider = 'calendar' AND c.connected_account_id IS NOT NULL
      AND (c.last_synced_at IS NULL OR c.last_synced_at <= ?)
    ORDER BY COALESCE(c.last_synced_at, '') ASC LIMIT 25`).bind(calendarCutoff).all<{ userId: string; login: string | null }>();
  const calendarSummary = { due: calendars.results.length, synced: 0, duplicate: 0, notConnected: 0, failed: 0 };
  for (const calendar of calendars.results) {
    if (dryRun) { calendarSummary.synced++; continue; }
    const runKey = `calendar:${calendar.userId}:${day}`;
    const inserted = await env.DB.prepare("INSERT OR IGNORE INTO scheduled_runs (id, user_id, rule_id, run_key, state, detail, created_at, updated_at) VALUES (?, ?, NULL, ?, 'running', NULL, ?, ?)")
      .bind(crypto.randomUUID(), calendar.userId, runKey, nowIso, nowIso).run();
    if ((inserted.meta.changes ?? 0) === 0) { calendarSummary.duplicate++; continue; }
    try {
      const result = await syncCalendarForUser(env, { id: calendar.userId, login: calendar.login ?? undefined }, now);
      const state = result.connected ? "synced" : "not_connected";
      await env.DB.prepare("UPDATE scheduled_runs SET state = ?, detail = ?, updated_at = ? WHERE run_key = ?")
        .bind(state, JSON.stringify(result), new Date().toISOString(), runKey).run();
      if (result.connected) calendarSummary.synced++; else calendarSummary.notConnected++;
    } catch (error) {
      calendarSummary.failed++;
      await env.DB.prepare("UPDATE scheduled_runs SET state = 'failed', detail = ?, updated_at = ? WHERE run_key = ?")
        .bind(JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 120) : "unknown" }), new Date().toISOString(), runKey).run();
    }
  }
  const due = await env.DB.prepare(`SELECT r.id AS ruleId, r.user_id AS userId, u.timezone, p.quiet_start_hour AS quietStart, p.quiet_end_hour AS quietEnd
    FROM proactive_rules r JOIN users u ON u.id = r.user_id JOIN concierge_profiles p ON p.user_id = r.user_id
    WHERE r.enabled = 1 AND p.proactive_enabled = 1 AND r.next_eligible_at <= ? ORDER BY r.next_eligible_at LIMIT 25`).bind(nowIso).all<{ ruleId: string; userId: string; timezone: string; quietStart: number; quietEnd: number }>();
  const summary = { due: due.results.length, prepared: 0, skippedQuietHours: 0, duplicate: 0, failed: 0, dryRun };
  for (const rule of due.results) {
    if (quietNow(now, rule.timezone, rule.quietStart, rule.quietEnd)) { summary.skippedQuietHours++; continue; }
    const runKey = `${rule.ruleId}:${day}`;
    if (dryRun) { summary.prepared++; continue; }
    const inserted = await env.DB.prepare("INSERT OR IGNORE INTO scheduled_runs (id, user_id, rule_id, run_key, state, detail, created_at, updated_at) VALUES (?, ?, ?, ?, 'running', NULL, ?, ?)")
      .bind(crypto.randomUUID(), rule.userId, rule.ruleId, runKey, nowIso, nowIso).run();
    if ((inserted.meta.changes ?? 0) === 0) { summary.duplicate++; continue; }
    try {
      const response = await prepareDueFlowerRule(env, rule.userId, nowIso, true);
      const result = await response.clone().json() as { state?: string; error?: string };
      const state = response.ok ? (result.state ?? "prepared") : "failed";
      await env.DB.prepare("UPDATE scheduled_runs SET state = ?, detail = ?, updated_at = ? WHERE run_key = ?").bind(state, JSON.stringify(result), new Date().toISOString(), runKey).run();
      if (response.ok) summary.prepared++; else summary.failed++;
    } catch (error) {
      summary.failed++;
      await env.DB.prepare("UPDATE scheduled_runs SET state = 'failed', detail = ?, updated_at = ? WHERE run_key = ?")
        .bind(JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 120) : "unknown" }), new Date().toISOString(), runKey).run();
    }
  }
  return json({ calendar: calendarSummary, reminders: summary }, 200);
}

function quietNow(now: Date, timezone: string, start: number, end: number) {
  let hour = now.getUTCHours();
  try { hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }).format(now)) % 24; } catch { /* UTC fallback */ }
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}
function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers }); }
