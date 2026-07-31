import { describe, expect, it, vi } from "vitest";
import { SensoClient } from "../providers/senso/client";

describe("Senso adapter", () => {
  it("runs context-only retrieval and maps provenance", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ query: "Sarah gift", max_results: 3 });
      return new Response(JSON.stringify({ results: [{ content_id: "content-1", title: "fixture.md", chunk_text: "Sarah likes tea.", score: 0.9 }] }));
    });
    const memories = await new SensoClient("key", fetcher as typeof fetch).searchMemory("Sarah gift");
    expect(memories).toEqual([{ contentId: "content-1", title: "fixture.md", text: "Sarah likes tea.", score: 0.9 }]);
  });
});
