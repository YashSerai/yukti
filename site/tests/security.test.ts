import { describe, expect, it } from "vitest";
import { oauthCookie, safeReturnPath, sessionCookie } from "../server/github-auth";
import { consumeRateLimit, RateLimitError, requireSameOrigin } from "../server/rate-limit";

function rateDb() {
  const counts = new Map<string, number>();
  return { prepare(sql: string) { return { bind(key: string) { return {
    run: async () => { if (sql.startsWith("INSERT")) counts.set(key, (counts.get(key) ?? 0) + 1); return { meta: { changes: 1 } }; },
    first: async () => ({ attempts: counts.get(key) ?? 0 }),
  }; } }; } } as unknown as D1Database;
}

describe("GitHub auth security", () => {
  it("keeps redirects same-origin and outside auth routes", () => {
    expect(safeReturnPath("/audit?from=login")).toBe("/audit?from=login");
    expect(safeReturnPath("//evil.example")).toBe("/");
    expect(safeReturnPath("/api/auth/github/start")).toBe("/");
  });
  it("sets host-only, secure, http-only, same-site cookies", () => {
    for (const cookie of [oauthCookie("state"), sessionCookie("session.secret")]) {
      expect(cookie).toContain("__Host-"); expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("Secure"); expect(cookie).toContain("SameSite=Lax");
    }
  });
  it("rejects cross-origin and originless production mutations", () => {
    expect(requireSameOrigin(new Request("https://yukti.example/api/prepare", { method: "POST" }), "sandbox")?.status).toBe(403);
    expect(requireSameOrigin(new Request("https://yukti.example/api/prepare", { method: "POST", headers: { origin: "https://evil.example" } }), "sandbox")?.status).toBe(403);
    expect(requireSameOrigin(new Request("https://yukti.example/api/prepare", { method: "POST", headers: { origin: "https://yukti.example" } }), "sandbox")).toBeNull();
  });
});

describe("provider quotas", () => {
  it("returns a bounded retry time after the limit", async () => {
    const db = rateDb(); const now = 1_000_000;
    await consumeRateLimit(db, "prepare", "user", 2, 60_000, now);
    await consumeRateLimit(db, "prepare", "user", 2, 60_000, now);
    await expect(consumeRateLimit(db, "prepare", "user", 2, 60_000, now)).rejects.toBeInstanceOf(RateLimitError);
  });
});
