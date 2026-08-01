import { describe, expect, it, vi } from "vitest";
import { GeminiFlashClient } from "../providers/gemini/client";

describe("Gemini Flash adapter", () => {
  it("rejects Pro models", () => {
    expect(() => new GeminiFlashClient("key", "gemini-3.1-pro")).toThrow("Flash models only");
  });

  it("returns a structured brief and constrains the prompt", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.contents[0].parts[0].text).toContain("never claim that a transaction has been approved");
      expect(body.generationConfig.responseMimeType).toBe("application/json");
      expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
      return new Response(JSON.stringify({
        modelVersion: "gemini-3.6-flash",
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({
          summary: "Both options fit the seeded context.",
          candidateReasons: [
            { candidateId: "cand-tea", reason: "It directly matches the jasmine tea fact." },
            { candidateId: "cand-book", reason: "It connects to the ceramics class without guessing a size." },
          ],
          caution: "Availability and delivery remain fixture data until verified.",
        }) }] } }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      }));
    });
    const brief = await new GeminiFlashClient("key", "gemini-3.6-flash", fetcher as typeof fetch).prepareBirthdayBrief();
    expect(brief).toMatchObject({ model: "gemini-3.6-flash", usage: { promptTokens: 100, outputTokens: 50 } });
  });

  it("retries one transient gateway failure", async () => {
    const success = JSON.stringify({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({
        summary: "Both options fit.",
        candidateReasons: [
          { candidateId: "cand-tea", reason: "Matches the tea preference." },
          { candidateId: "cand-book", reason: "Matches the ceramics interest." },
        ],
        caution: "Availability and delivery remain fixture data until verified.",
      }) }] } }],
    });
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(success));
    await expect(new GeminiFlashClient("key", "gemini-3.6-flash", fetcher).prepareBirthdayBrief()).resolves.toMatchObject({ summary: "Both options fit." });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("uses Google Search and requires cited product evidence", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tools).toEqual([{ type: "google_search" }]);
      expect(body.input).toContain("Delivery location supplied by the user: Vancouver, BC");
      return new Response(JSON.stringify({ model: "gemini-3.6-flash", output: [
        { type: "google_search_call", queries: ["FTD Sweet Pretty Bouquet Vancouver"] },
        { type: "model_output", content: [{ type: "text", text: "FTD currently lists the bouquet. Confirm the exact address and delivery date with FTD.", annotations: [
          { type: "url_citation", url: "https://www.ftd.com/product/sweet-pretty-bouquet-prd-b35", title: "FTD" },
        ] }] },
      ] }));
    });
    const research = await new GeminiFlashClient("key", "gemini-3.6-flash", fetcher as typeof fetch).researchCurrentProduct({
      personName: "Sarah", location: "Vancouver, BC", maximumAmountMinor: 7000, preferences: ["tulips"],
      product: { merchantProductId: "b35", merchant: "FTD", title: "Sweet & Pretty Bouquet", amountMinor: 4500, currency: "USD", url: "https://www.ftd.com/product/sweet-pretty-bouquet-prd-b35", imageUrl: null, availability: "Check with merchant", retrievedAt: "2026-07-31T00:00:00.000Z" },
    });
    expect(research).toMatchObject({ model: "gemini-3.6-flash", citations: [{ title: "FTD" }] });
  });
});
