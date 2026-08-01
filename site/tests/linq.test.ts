import { describe, expect, it, vi } from "vitest";
import { LinqClient } from "../providers/linq/client";

describe("Linq adapter", () => {
  it("checks the configured sender without sending", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ phone_numbers: [{ id: "line", phone_number: "+12134989364", reputation: { status: "HEALTHY" } }] })));
    await expect(new LinqClient("token", "+12134989364", fetcher as typeof fetch).health()).resolves.toEqual({ configured: true, status: "HEALTHY" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses an idempotency key for an approved initial message", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.message.idempotency_key).toMatch(/^yukti-[a-f0-9]{24}$/);
      expect(body).toMatchObject({ from: "+12134989364", to: ["+17782316707"], message: { parts: [{ type: "text", value: "Yukti reminder" }] } });
      return new Response(JSON.stringify({ chat: { id: "chat-1" } }));
    });
    const result = await new LinqClient("token", "+12134989364", fetcher as typeof fetch).sendApprovedMessage("+17782316707", "Yukti reminder");
    expect(result).toMatchObject({ messageId: "chat-1", evidence: { provider: "linq", sourceKind: "sandbox" } });
  });

  it("rejects links in a first message", async () => {
    await expect(new LinqClient("token", "+12134989364").sendApprovedMessage("+17782316707", "Visit https://example.com")).rejects.toThrow("cannot contain a URL");
  });
});
