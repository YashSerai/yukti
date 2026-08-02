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

  it("creates a user-scoped calendar auth link", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({ user_id: "user-1", auth_config_id: "ac_calendar", callback_url: "https://yukti.example/?calendar=returned" });
      return new Response(JSON.stringify({ redirect_url: "https://accounts.google.com/oauth", connected_account_id: "ca-1" }));
    });
    await expect(new ComposioClient("key", fetcher as typeof fetch).createCalendarLink("user-1", "ac_calendar", "https://yukti.example/?calendar=returned"))
      .resolves.toEqual({ redirectUrl: "https://accounts.google.com/oauth", connectionId: "ca-1" });
  });
});
