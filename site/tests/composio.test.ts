import { describe, expect, it, vi } from "vitest";
import { ComposioClient } from "../providers/composio/client";

describe("Composio adapter", () => {
  it("reports only an active, enabled calendar connection for the same user", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain("user_ids=yukti-owner");
      return new Response(JSON.stringify({ items: [{ id: "ca-1", user_id: "yukti-owner", status: "ACTIVE", is_disabled: false, toolkit: { slug: "googlecalendar" } }] }));
    });
    await expect(new ComposioClient("key", fetcher as typeof fetch).calendarConnection("yukti-owner")).resolves.toEqual({ connected: true, accountId: "ca-1" });
  });
});
