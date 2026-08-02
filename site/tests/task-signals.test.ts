import { describe, expect, it } from "vitest";
import { calendarTasks } from "../domain/task-signals";

describe("connected task normalization", () => {
  it("normalizes calendar records and ignores malformed rows", () => {
    const tasks = calendarTasks({ data: { items: [
      { id: "evt-1", summary: "Mom's birthday", start: { date: "2026-09-03" }, location: "Victoria, BC", htmlLink: "https://calendar.google.com/event/1" },
      { id: "evt-2", start: { dateTime: "2026-09-04T10:00:00-07:00" } },
    ] } });
    expect(tasks).toEqual([expect.objectContaining({ externalId: "googlecalendar:evt-1", kind: "occasion", title: "Mom's birthday", location: "Victoria, BC" })]);
  });
});
