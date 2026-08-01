import type { RequestIdentity } from "./identity";

export const SESSION_COOKIE = "__Host-yukti_session";
export const OAUTH_COOKIE = "__Host-yukti_oauth";
const LOGIN_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60_000;

type AuthEnv = { DB: D1Database; GITHUB_CLIENT_ID?: string; GITHUB_CLIENT_SECRET?: string; GITHUB_CALLBACK_URL?: string };
type GitHubProfile = { id: number; login: string; name: string | null };

export async function beginGitHubLogin(request: Request, env: AuthEnv) {
  if (!env.GITHUB_CLIENT_ID) return json({ error: "github_login_not_configured" }, 503);
  const url = new URL(request.url);
  const state = randomSecret(32);
  const verifier = randomSecret(48);
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO web_login_attempts
    (state_hash, code_verifier, return_to, expires_at, consumed_at, created_at)
    VALUES (?, ?, ?, ?, NULL, ?)`)
    .bind(await sha256(state), verifier, safeReturnPath(url.searchParams.get("return_to")), now + LOGIN_TTL_MS, now).run();
  const callback = env.GITHUB_CALLBACK_URL || `${url.origin}/api/auth/github/callback`;
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", await sha256Base64Url(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");
  return new Response(null, { status: 302, headers: secureHeaders({ location: authorize.toString(), "set-cookie": oauthCookie(state) }) });
}

export async function finishGitHubLogin(request: Request, env: AuthEnv) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const cookieState = readCookie(request, OAUTH_COOKIE);
  if (!state || !code || !cookieState || !constantTimeEqual(state, cookieState)) return authFailure(url.origin, "invalid_request");
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return authFailure(url.origin, "not_configured");
  const now = Date.now();
  const stateHash = await sha256(state);
  const attempt = await env.DB.prepare(`SELECT code_verifier AS codeVerifier, return_to AS returnTo
    FROM web_login_attempts WHERE state_hash = ? AND consumed_at IS NULL AND expires_at > ? LIMIT 1`)
    .bind(stateHash, now).first<{ codeVerifier: string; returnTo: string }>();
  if (!attempt) return authFailure(url.origin, "expired");
  const consumed = await env.DB.prepare(`UPDATE web_login_attempts SET consumed_at = ?
    WHERE state_hash = ? AND consumed_at IS NULL AND expires_at > ?`).bind(now, stateHash, now).run();
  if (Number(consumed.meta.changes ?? 0) !== 1) return authFailure(url.origin, "replayed");
  try {
    const callback = env.GITHUB_CALLBACK_URL || `${url.origin}/api/auth/github/callback`;
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: callback, code_verifier: attempt.codeVerifier }),
    });
    const token = await tokenResponse.json() as { access_token?: unknown };
    if (!tokenResponse.ok || typeof token.access_token !== "string" || !token.access_token) throw new Error("token_exchange_failed");
    const profileResponse = await fetch("https://api.github.com/user", { headers: {
      accept: "application/vnd.github+json", authorization: `Bearer ${token.access_token}`, "user-agent": "Yukti", "x-github-api-version": "2022-11-28",
    }, signal: AbortSignal.timeout(8_000) });
    const raw = await profileResponse.json() as { id?: unknown; login?: unknown; name?: unknown };
    if (!profileResponse.ok || !Number.isSafeInteger(raw.id) || Number(raw.id) <= 0 || typeof raw.login !== "string" || !raw.login) throw new Error("identity_invalid");
    const profile: GitHubProfile = { id: Number(raw.id), login: raw.login, name: typeof raw.name === "string" ? raw.name : null };
    const session = await createSession(env.DB, profile, now);
    const headers = secureHeaders({ location: new URL(safeReturnPath(attempt.returnTo), url.origin).toString() });
    headers.append("set-cookie", sessionCookie(session.value));
    headers.append("set-cookie", oauthCookie("", 0));
    return new Response(null, { status: 302, headers });
  } catch {
    return authFailure(url.origin, "authentication_failed");
  }
}

export async function identityFromSession(request: Request, db: D1Database): Promise<RequestIdentity | null> {
  const value = readCookie(request, SESSION_COOKIE);
  const separator = value.indexOf(".");
  if (separator < 1 || value.length > 512) return null;
  const sessionId = value.slice(0, separator);
  const secret = value.slice(separator + 1);
  if (!sessionId || !secret) return null;
  const row = await db.prepare(`SELECT s.user_id AS id, g.provider_subject AS subject, g.login, g.display_name AS displayName
    FROM web_sessions s JOIN github_identities g ON g.user_id = s.user_id
    WHERE s.id = ? AND s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? LIMIT 1`)
    .bind(sessionId, await sha256(secret), Date.now()).first<{ id: string; subject: string; login: string; displayName: string | null }>();
  if (!row) return null;
  return { id: row.id, displayName: row.displayName || row.login, email: `${row.subject}+${row.login}@users.noreply.github.com`, login: row.login };
}

export async function logoutGitHub(request: Request, db: D1Database) {
  const value = readCookie(request, SESSION_COOKIE);
  const sessionId = value.split(".", 1)[0];
  if (sessionId) await db.prepare("UPDATE web_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").bind(Date.now(), sessionId).run();
  return new Response(null, { status: 204, headers: secureHeaders({ "set-cookie": sessionCookie("", 0) }) });
}

async function createSession(db: D1Database, profile: GitHubProfile, now: number) {
  const subject = String(profile.id);
  let identity = await db.prepare("SELECT user_id AS userId FROM github_identities WHERE provider_subject = ? LIMIT 1").bind(subject).first<{ userId: string }>();
  if (!identity) {
    const userId = crypto.randomUUID();
    const stamp = new Date(now).toISOString();
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO users (id, chatgpt_user_id, display_name, timezone, created_at, updated_at) VALUES (?, ?, ?, 'America/Vancouver', ?, ?)")
        .bind(userId, `github:${subject}`, profile.name || profile.login, stamp, stamp),
      db.prepare("INSERT OR IGNORE INTO github_identities (provider_subject, user_id, login, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(subject, userId, profile.login, profile.name, now, now),
    ]);
    identity = await db.prepare("SELECT user_id AS userId FROM github_identities WHERE provider_subject = ? LIMIT 1").bind(subject).first<{ userId: string }>();
  } else {
    await db.prepare("UPDATE github_identities SET login = ?, display_name = ?, updated_at = ? WHERE provider_subject = ?")
      .bind(profile.login, profile.name, now, subject).run();
  }
  if (!identity) throw new Error("identity_create_failed");
  const id = crypto.randomUUID();
  const secret = randomSecret(32);
  await db.prepare("INSERT INTO web_sessions (id, user_id, token_hash, expires_at, revoked_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)")
    .bind(id, identity.userId, await sha256(secret), now + SESSION_TTL_MS, now).run();
  return { value: `${id}.${secret}` };
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/";
  try { const parsed = new URL(value, "https://yukti.local"); return parsed.origin === "https://yukti.local" && !parsed.pathname.startsWith("/api/auth/") ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/"; }
  catch { return "/"; }
}

export function sessionCookie(value: string, maxAge = Math.floor(SESSION_TTL_MS / 1000)) { return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; }
export function oauthCookie(value: string, maxAge = Math.floor(LOGIN_TTL_MS / 1000)) { return `${OAUTH_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; }
export async function sha256(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256Base64Url(value: string) { return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))); }
function randomSecret(length: number) { return base64Url(crypto.getRandomValues(new Uint8Array(length))); }
function base64Url(bytes: Uint8Array) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function constantTimeEqual(left: string, right: string) { if (left.length !== right.length) return false; let diff = 0; for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i); return diff === 0; }
function readCookie(request: Request, name: string) { const item = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`)); try { return item ? decodeURIComponent(item.slice(name.length + 1)) : ""; } catch { return ""; } }
function secureHeaders(values: Record<string, string>) { return new Headers({ ...values, "cache-control": "no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" }); }
function authFailure(origin: string, reason: string) { const target = new URL("/", origin); target.searchParams.set("auth_error", reason); return new Response(null, { status: 302, headers: secureHeaders({ location: target.toString(), "set-cookie": oauthCookie("", 0) }) }); }
function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers: secureHeaders({ "content-type": "application/json; charset=utf-8" }) }); }
