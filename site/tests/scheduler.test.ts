import { describe, expect, it } from "vitest";
import { handleScheduledJob } from "../server/scheduler-handler";

describe("proactive scheduler", () => {
  it("rejects missing and incorrect scheduler credentials before touching user data", async () => {
    const db = { prepare: () => { throw new Error("database must not be reached"); } } as unknown as D1Database;
    const endpoint = "https://yukti.example/api/jobs/proactive";
    const missing = await handleScheduledJob(new Request(endpoint, { method: "POST" }), { DB: db, YUKTI_SCHEDULER_SECRET: "correct" });
    const wrong = await handleScheduledJob(new Request(endpoint, { method: "POST", headers: { authorization: "Bearer wrong" } }), { DB: db, YUKTI_SCHEDULER_SECRET: "correct" });
    expect(missing?.status).toBe(401);
    expect(wrong?.status).toBe(401);
  });

  it("does not expose the endpoint to other methods", async () => {
    const db = {} as D1Database;
    const response = await handleScheduledJob(new Request("https://yukti.example/api/jobs/proactive"), { DB: db, YUKTI_SCHEDULER_SECRET: "correct" });
    expect(response?.status).toBe(405);
  });

  it("reports Calendar accounts due after 24 hours without syncing during a dry run", async () => {
    const db = {
      prepare(query: string) {
        return {
          bind() {
            return { all: async () => ({ results: query.includes("FROM connection_syncs")
              ? [{ userId: "usr-1", login: "person" }]
              : [] }) };
          },
        };
      },
    } as unknown as D1Database;
    const response = await handleScheduledJob(new Request("https://yukti.example/api/jobs/proactive?dry_run=1", {
      method: "POST", headers: { authorization: "Bearer correct" },
    }), { DB: db, YUKTI_SCHEDULER_SECRET: "correct" });
    expect(await response?.json()).toMatchObject({
      calendar: { due: 1, synced: 1, failed: 0 },
      reminders: { due: 0, prepared: 0, dryRun: true },
    });
  });
});
