import { describe, expect, it } from "vitest";
import { calendarTasks, emailTasks } from "../domain/task-signals";

describe("connected task normalization", () => {
  it("normalizes calendar records and ignores malformed rows", () => {
    const tasks = calendarTasks({ data: { items: [
      { id: "evt-1", summary: "Mom's birthday", start: { date: "2026-09-03" }, location: "Victoria, BC", htmlLink: "https://calendar.google.com/event/1" },
      { id: "evt-2", start: { dateTime: "2026-09-04T10:00:00-07:00" } },
    ] } });
    expect(tasks).toEqual([expect.objectContaining({ externalId: "googlecalendar:evt-1", kind: "occasion", title: "Mom's birthday", location: "Victoria, BC" })]);
  });

  it("keeps only relevant email signals and never stores a full unrelated inbox", () => {
    const tasks = emailTasks({ messages: [
      { id: "m1", subject: "Your passport expires September 8, 2026", snippet: "Renew before travel." },
      { id: "m2", subject: "Weekly newsletter", snippet: "Hello" },
    ] }, new Date("2026-08-02T12:00:00Z"));
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ externalId: "gmail:m1", kind: "admin", startsAt: "2026-09-08T12:00:00.000Z" });
  });
});
