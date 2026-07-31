import { z } from "zod";
import type { MessagingProvider } from "../contracts";

const phoneNumbersResponse = z.object({ phone_numbers: z.array(z.object({
  id: z.string().min(1), phone_number: z.string().regex(/^\+[1-9]\d{7,14}$/),
  reputation: z.object({ status: z.string() }),
})) });
const chatResponse = z.object({ id: z.string().min(1) }).passthrough();

export class LinqClient implements MessagingProvider {
  constructor(
    private readonly token: string,
    private readonly from: string,
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    if (!token) throw new Error("Linq token is required");
    if (!/^\+[1-9]\d{7,14}$/.test(from)) throw new Error("Linq sender must use E.164 format");
  }

  private async request(path: string, init?: RequestInit) {
    const response = await this.fetcher(`https://api.linqapp.com/api/partner/v3${path}`, {
      ...init,
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json", ...init?.headers },
    });
    if (!response.ok) throw new Error(`Linq request failed with status ${response.status}`);
    return response;
  }

  async health() {
    const result = phoneNumbersResponse.parse(await (await this.request("/phone_numbers")).json());
    const line = result.phone_numbers.find((item) => item.phone_number === this.from);
    return { configured: Boolean(line), status: line?.reputation.status ?? "NOT_FOUND" };
  }

  async sendApprovedMessage(to: string, body: string) {
    if (!/^\+[1-9]\d{7,14}$/.test(to)) throw new Error("Linq recipient must use E.164 format");
    if (!body.trim() || body.length > 10_000) throw new Error("Linq message body is invalid");
    if (/https?:\/\//i.test(body)) throw new Error("The first Linq message cannot contain a URL");
    const idempotencyKey = `yukti-${await digest(`${this.from}|${to}|${body}`)}`;
    const result = chatResponse.parse(await (await this.request("/chats", { method: "POST", body: JSON.stringify({
      from: this.from,
      to: [to],
      message: { parts: [{ type: "text", value: body }], idempotency_key: idempotencyKey },
    }) })).json());
    return { messageId: result.id, evidence: { sourceKind: "sandbox" as const, provider: "linq", retrievedAt: new Date().toISOString(), reference: result.id } };
  }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
