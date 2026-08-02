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
});
