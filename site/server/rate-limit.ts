export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) { super("rate_limited"); }
}

export async function consumeRateLimit(db: D1Database, scope: string, actor: string, limit: number, windowMs: number, now = Date.now()) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = windowStart + windowMs;
  const key = `yukti:${scope}:${actor}:${windowStart}`;
  await db.prepare(`INSERT INTO rate_limits (key, attempt_count, window_expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET attempt_count = attempt_count + 1`).bind(key, expiresAt).run();
  const row = await db.prepare("SELECT attempt_count AS attempts FROM rate_limits WHERE key = ?").bind(key).first<{ attempts: number }>();
  if ((row?.attempts ?? limit + 1) > limit) throw new RateLimitError(Math.max(1, Math.ceil((expiresAt - now) / 1000)));
}

export async function guardProviderUse(db: D1Database, scope: "prepare" | "prava", userId: string) {
  if (scope === "prepare") {
    await consumeRateLimit(db, scope, userId, 1, 15_000);
    await consumeRateLimit(db, scope, userId, 3, 60 * 60_000);
    await consumeRateLimit(db, scope, userId, 10, 24 * 60 * 60_000);
    await consumeRateLimit(db, `${scope}:global`, "all", 100, 24 * 60 * 60_000);
  } else {
    await consumeRateLimit(db, scope, userId, 1, 30_000);
    await consumeRateLimit(db, scope, userId, 3, 60 * 60_000);
    await consumeRateLimit(db, scope, userId, 10, 24 * 60 * 60_000);
    await consumeRateLimit(db, `${scope}:global`, "all", 50, 24 * 60 * 60_000);
  }
}

export function requireSameOrigin(request: Request, mode: string | undefined) {
  if (mode !== "sandbox") return null;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new Response(JSON.stringify({ error: "invalid_origin" }), {
    status: 403, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
  return null;
}
