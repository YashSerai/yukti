import { ComposioClient } from "../providers/composio/client";
import type { RequestIdentity } from "./identity";
import { sha256 } from "./github-auth";

export type OnboardingEnv = {
  DB: D1Database;
  YUKTI_APP_URL?: string;
  YUKTI_OWNER_GITHUB_LOGIN?: string;
  LINQ_PHONE_NUMBER?: string;
  COMPOSIO_API_KEY?: string;
  COMPOSIO_USER_ID?: string;
  COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID?: string;
};

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleOnboardingRequest(request: Request, env: OnboardingEnv, identity: RequestIdentity): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/onboarding")) return null;
  if (url.pathname === "/api/onboarding" && request.method === "GET") return json(await onboardingStatus(env, identity), 200);
  if (url.pathname === "/api/onboarding/pair" && request.method === "POST") return startPairing(request, env, identity);
  if (url.pathname === "/api/onboarding/person" && request.method === "POST") return addFirstPerson(request, env.DB, identity.id);
  if (url.pathname === "/api/onboarding/calendar" && request.method === "POST") return startCalendarConnection(env, identity);
  if (url.pathname === "/api/onboarding/complete" && request.method === "POST") return completeOnboarding(env.DB, identity.id);
  return json({ error: "not_found" }, 404);
}

export async function onboardingStatus(env: OnboardingEnv, identity: RequestIdentity) {
  const ownerLogin = (env.YUKTI_OWNER_GITHUB_LOGIN ?? "YashSerai").toLowerCase();
  const isOwner = identity.login?.toLowerCase() === ownerLogin;
  const [profile, pairing, people, account] = await Promise.all([
    env.DB.prepare("SELECT phone_e164 AS phone FROM concierge_profiles WHERE user_id = ? LIMIT 1").bind(identity.id).first<{ phone: string }>(),
    env.DB.prepare("SELECT phone_e164 AS phone, expires_at AS expiresAt, verified_at AS verifiedAt FROM linq_pairings WHERE user_id = ? LIMIT 1").bind(identity.id).first<{ phone: string; expiresAt: number; verifiedAt: number | null }>(),
    env.DB.prepare("SELECT count(*) AS count FROM people WHERE user_id = ?").bind(identity.id).first<{ count: number }>(),
    env.DB.prepare("SELECT onboarding_completed_at AS completedAt FROM users WHERE id = ? LIMIT 1").bind(identity.id).first<{ completedAt: string | null }>(),
  ]);
  const phoneConnected = Boolean(profile?.phone);
  const peopleCount = Number(people?.count ?? 0);
  let calendarConnected = false;
  if (env.COMPOSIO_API_KEY && peopleCount > 0) {
    try { calendarConnected = (await new ComposioClient(env.COMPOSIO_API_KEY).calendarConnection(composioUserId(env, identity))).connected; }
    catch { calendarConnected = false; }
  }
  return {
    isOwner,
    complete: Boolean(account?.completedAt),
    phoneConnected,
    phone: profile?.phone ? maskPhone(profile.phone) : pairing?.phone ? maskPhone(pairing.phone) : null,
    pairingPending: Boolean(pairing && !pairing.verifiedAt && pairing.expiresAt > Date.now()),
    pairingExpiresAt: pairing && !pairing.verifiedAt ? new Date(pairing.expiresAt).toISOString() : null,
    peopleCount,
    calendarConnected,
    linqNumber: env.LINQ_PHONE_NUMBER ?? null,
  };
}

async function completeOnboarding(db: D1Database, userId: string) {
  const readiness = await db.prepare(`SELECT EXISTS(SELECT 1 FROM concierge_profiles WHERE user_id = ?) AS phoneConnected,
    EXISTS(SELECT 1 FROM people WHERE user_id = ?) AS hasPerson`).bind(userId, userId).first<{ phoneConnected: number; hasPerson: number }>();
  if (!readiness?.phoneConnected || !readiness.hasPerson) return json({ error: "onboarding_incomplete" }, 409);
  const now = new Date().toISOString();
  await db.prepare("UPDATE users SET onboarding_completed_at = ?, updated_at = ? WHERE id = ?").bind(now, now, userId).run();
  return json({ complete: true }, 200);
}

async function startPairing(request: Request, env: OnboardingEnv, identity: RequestIdentity) {
  if (!env.LINQ_PHONE_NUMBER) return json({ error: "messaging_unavailable" }, 503);
  const body = await bodyJson(request);
  const phone = normalizePhone(body.phone);
  if (!phone) return json({ error: "valid_phone_required" }, 400);
  const owned = await env.DB.prepare("SELECT user_id AS userId FROM concierge_profiles WHERE phone_e164 = ? LIMIT 1").bind(phone).first<{ userId: string }>();
  if (owned && owned.userId !== identity.id) return json({ error: "phone_already_connected" }, 409);
  const reserved = await env.DB.prepare("SELECT user_id AS userId FROM linq_pairings WHERE phone_e164 = ? LIMIT 1").bind(phone).first<{ userId: string }>();
  if (reserved && reserved.userId !== identity.id) return json({ error: "phone_already_connected" }, 409);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  const now = new Date().toISOString();
  const expiresAt = Date.now() + 10 * 60_000;
  await env.DB.prepare(`INSERT INTO linq_pairings (user_id, phone_e164, code_hash, expires_at, verified_at, attempt_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, 0, ?, ?) ON CONFLICT(user_id) DO UPDATE SET phone_e164 = excluded.phone_e164, code_hash = excluded.code_hash,
    expires_at = excluded.expires_at, verified_at = NULL, attempt_count = 0, updated_at = excluded.updated_at`)
    .bind(identity.id, phone, await sha256(code), expiresAt, now, now).run();
  return json({ code, message: `YUKTI ${code}`, linqNumber: env.LINQ_PHONE_NUMBER, expiresAt: new Date(expiresAt).toISOString() }, 201);
}

async function addFirstPerson(request: Request, db: D1Database, userId: string) {
  const profile = await db.prepare("SELECT 1 AS ok FROM concierge_profiles WHERE user_id = ? LIMIT 1").bind(userId).first<{ ok: number }>();
  if (!profile) return json({ error: "messaging_connection_required" }, 409);
  const body = await bodyJson(request);
  const name = text(body.name, 40);
  const relationship = text(body.relationship, 40);
  if (!name || !relationship) return json({ error: "name_and_relationship_required" }, 400);
  const now = new Date().toISOString();
  const existing = await db.prepare("SELECT id FROM people WHERE user_id = ? AND lower(name) = lower(?) LIMIT 1").bind(userId, name).first<{ id: string }>();
  const personId = existing?.id ?? crypto.randomUUID();
  if (existing) {
    await db.prepare("UPDATE people SET relationship = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(relationship, now, personId, userId).run();
  } else {
    await db.prepare("INSERT INTO people (id, user_id, name, relationship, notes, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)").bind(personId, userId, name, relationship, now, now).run();
  }
  const existingFact = await db.prepare("SELECT id FROM memory_facts WHERE user_id = ? AND person_id = ? AND kind = 'relationship' LIMIT 1").bind(userId, personId).first<{ id: string }>();
  const factText = `${name} is your ${relationship}`;
  if (existingFact) {
    await db.prepare("UPDATE memory_facts SET fact = ?, value = ?, status = 'confirmed', origin = 'explicit', source = 'Added in Yukti', confidence = 100, updated_at = ? WHERE id = ? AND user_id = ?").bind(factText, relationship, now, existingFact.id, userId).run();
  } else {
    await db.prepare(`INSERT INTO memory_facts (id, user_id, person_id, fact, kind, value, status, origin, source_message_id, source, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'relationship', ?, 'confirmed', 'explicit', NULL, 'Added in Yukti', 100, ?, ?)`)
      .bind(crypto.randomUUID(), userId, personId, factText, relationship, now, now).run();
  }
  await db.prepare("INSERT INTO audit_events (id, user_id, event_id, kind, detail, created_at, updated_at) VALUES (?, ?, NULL, 'onboarding.completed', ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, JSON.stringify({ firstPersonId: personId }), now, now).run();
  return json({ saved: true }, 201);
}

async function startCalendarConnection(env: OnboardingEnv, identity: RequestIdentity) {
  if (!env.COMPOSIO_API_KEY || !env.COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID) return json({ error: "calendar_connection_unavailable" }, 503);
  const callbackUrl = `${env.YUKTI_APP_URL ?? "https://yukti.yashns.chatgpt.site"}/?calendar=returned`;
  try {
    const result = await new ComposioClient(env.COMPOSIO_API_KEY).createCalendarLink(composioUserId(env, identity), env.COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID, callbackUrl);
    return json(result, 201);
  } catch { return json({ error: "calendar_connection_failed" }, 502); }
}

export async function resolveLinqUser(db: D1Database, phone: string, textBody: string) {
  const profile = await db.prepare(`SELECT u.id, u.display_name FROM concierge_profiles p JOIN users u ON u.id = p.user_id WHERE p.phone_e164 = ? LIMIT 1`)
    .bind(phone).first<{ id: string; display_name: string }>();
  if (profile) return { user: profile, pairedNow: false };
  const pairing = await db.prepare(`SELECT p.user_id AS userId, p.code_hash AS codeHash, p.expires_at AS expiresAt, p.attempt_count AS attemptCount, u.display_name AS displayName
    FROM linq_pairings p JOIN users u ON u.id = p.user_id WHERE p.phone_e164 = ? AND p.verified_at IS NULL LIMIT 1`)
    .bind(phone).first<{ userId: string; codeHash: string; expiresAt: number; attemptCount: number; displayName: string }>();
  if (!pairing || pairing.expiresAt <= Date.now() || pairing.attemptCount >= 5) return null;
  const match = /^\s*YUKTI\s+(\d{6})\s*$/i.exec(textBody);
  if (!match || await sha256(match[1]) !== pairing.codeHash) {
    await db.prepare("UPDATE linq_pairings SET attempt_count = attempt_count + 1, updated_at = ? WHERE user_id = ? AND verified_at IS NULL").bind(new Date().toISOString(), pairing.userId).run();
    return null;
  }
  const now = new Date().toISOString();
  const verified = await db.prepare("UPDATE linq_pairings SET verified_at = ?, updated_at = ? WHERE user_id = ? AND verified_at IS NULL AND expires_at > ?")
    .bind(Date.now(), now, pairing.userId, Date.now()).run();
  if ((verified.meta.changes ?? 0) !== 1) return null;
  await db.prepare(`INSERT INTO concierge_profiles (user_id, phone_e164, proactive_enabled, quiet_start_hour, quiet_end_hour, created_at, updated_at)
    VALUES (?, ?, 1, 21, 8, ?, ?) ON CONFLICT(user_id) DO UPDATE SET phone_e164 = excluded.phone_e164, updated_at = excluded.updated_at`)
    .bind(pairing.userId, phone, now, now).run();
  return { user: { id: pairing.userId, display_name: pairing.displayName }, pairedNow: true };
}

export function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (/^\d{10}$/.test(compact)) return `+1${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

function composioUserId(env: OnboardingEnv, identity: RequestIdentity) {
  const owner = identity.login?.toLowerCase() === (env.YUKTI_OWNER_GITHUB_LOGIN ?? "YashSerai").toLowerCase();
  return owner ? env.COMPOSIO_USER_ID ?? "yukti-owner" : `yukti-${identity.id}`;
}
function maskPhone(phone: string) { return phone.length > 4 ? `${phone.slice(0, 2)} ••• ••• ${phone.slice(-4)}` : phone; }
async function bodyJson(request: Request): Promise<Record<string, unknown>> { try { return await request.json() as Record<string, unknown>; } catch { return {}; } }
function text(value: unknown, length: number) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, length) : ""; }
function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers }); }
