import { describe, expect, it } from "vitest";
import { identityFromRequest } from "../server/identity";
import { SESSION_COOKIE, sha256 } from "../server/github-auth";

describe("request identity", () => {
  it("accepts only a valid hashed GitHub session in sandbox mode", async () => {
    const secret = "session-secret";
    const tokenHash = await sha256(secret);
    const db = { prepare: () => ({ bind: (_id: string, hash: string) => ({
      first: async () => hash === tokenHash ? { id: "usr-random", subject: "12345", login: "judge", displayName: "Judge" } : null,
    }) }) } as unknown as D1Database;
    const valid = new Request("https://yukti.example", { headers: { cookie: `${SESSION_COOKIE}=session-id.${secret}` } });
    const forged = new Request("https://yukti.example", { headers: { cookie: `${SESSION_COOKIE}=session-id.wrong` } });
    expect(await identityFromRequest(valid, db, "sandbox")).toEqual({ id: "usr-random", displayName: "Judge", email: "12345+judge@users.noreply.github.com", login: "judge" });
    expect(await identityFromRequest(forged, db, "sandbox")).toBeNull();
  });

  it("permits a fixture identity only in non-connected modes", async () => {
    const db = { prepare: () => ({ bind: () => ({ first: async () => null }) }) } as unknown as D1Database;
    const request = new Request("https://yukti.example");
    expect(await identityFromRequest(request, db, "seeded")).toMatchObject({ id: "usr_seeded_judge", login: "judge-demo" });
    expect(await identityFromRequest(request, db, "sandbox")).toBeNull();
    expect(await identityFromRequest(request, db, "connected")).toBeNull();
  });
});
