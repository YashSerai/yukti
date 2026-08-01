import { z } from "zod";

const searchResponse = z.object({
  results: z.array(z.object({
    content_id: z.string().min(1),
    chunk_text: z.string().min(1),
    score: z.number(),
    title: z.string().min(1),
  })),
});

export type SensoMemory = { contentId: string; title: string; text: string; score: number };

export class SensoClient {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {
    if (!apiKey) throw new Error("Senso API key is required");
  }

  async searchMemory(query: string): Promise<SensoMemory[]> {
    const response = await this.fetcher("https://apiv2.senso.ai/api/v1/org/search/context", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json", accept: "application/json", "x-api-key": this.apiKey },
      body: JSON.stringify({ query, max_results: 3 }),
    });
    if (!response.ok) throw new Error(`Senso request failed with status ${response.status}`);
    const result = searchResponse.parse(await response.json());
    return result.results.map((item) => ({ contentId: item.content_id, title: item.title, text: item.chunk_text, score: item.score }));
  }
}
