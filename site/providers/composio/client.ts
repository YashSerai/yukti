import { z } from "zod";

const accountsResponse = z.object({ items: z.array(z.object({
  id: z.string().min(1), user_id: z.string(), status: z.string(), is_disabled: z.boolean(),
  toolkit: z.object({ slug: z.string() }),
})) });
const linkResponse = z.object({ redirect_url: z.string().url(), connected_account_id: z.string().optional(), id: z.string().optional() });

export class ComposioClient {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {
    if (!apiKey) throw new Error("Composio API key is required");
  }

  async calendarConnection(userId: string) {
    const params = new URLSearchParams({ limit: "20", user_ids: userId, toolkit_slugs: "googlecalendar", statuses: "ACTIVE" });
    const response = await this.fetcher(`https://backend.composio.dev/api/v3.1/connected_accounts?${params}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "x-api-key": this.apiKey, accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Composio request failed with status ${response.status}`);
    const data = accountsResponse.parse(await response.json());
    const account = data.items.find((item) => item.user_id === userId && item.toolkit.slug.toLowerCase() === "googlecalendar" && item.status === "ACTIVE" && !item.is_disabled);
    return account ? { connected: true as const, accountId: account.id } : { connected: false as const };
  }

  async createCalendarLink(userId: string, authConfigId: string, callbackUrl: string) {
    if (!/^ac_[A-Za-z0-9_-]+$/.test(authConfigId)) throw new Error("Composio auth config is invalid");
    const response = await this.fetcher("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "x-api-key": this.apiKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId, auth_config_id: authConfigId, callback_url: callbackUrl, alias: `yukti-${userId}` }),
    });
    if (!response.ok) throw new Error(`Composio link request failed with status ${response.status}`);
    const data = linkResponse.parse(await response.json());
    return { redirectUrl: data.redirect_url, connectionId: data.connected_account_id ?? data.id ?? null };
  }
}
