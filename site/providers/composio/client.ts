import { z } from "zod";

const accountsResponse = z.object({ items: z.array(z.object({
  id: z.string().min(1), user_id: z.string(), status: z.string(), is_disabled: z.boolean(),
  toolkit: z.object({ slug: z.string() }),
})) });
const linkResponse = z.object({ redirect_url: z.string().url(), connected_account_id: z.string().optional(), id: z.string().optional() });
const executeResponse = z.object({ successful: z.boolean(), data: z.unknown().optional(), error: z.unknown().optional() });

export class ComposioClient {
  constructor(private readonly apiKey: string, private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {
    if (!apiKey) throw new Error("Composio API key is required");
  }

  async calendarConnection(userId: string) {
    return this.toolkitConnection(userId, "googlecalendar");
  }

  async toolkitConnection(userId: string, toolkit: "googlecalendar") {
    const params = new URLSearchParams({ limit: "20", user_ids: userId, toolkit_slugs: toolkit, statuses: "ACTIVE" });
    const response = await this.fetcher(`https://backend.composio.dev/api/v3.1/connected_accounts?${params}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "x-api-key": this.apiKey, accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Composio request failed with status ${response.status}`);
    const data = accountsResponse.parse(await response.json());
    const account = data.items.find((item) => item.user_id === userId && item.toolkit.slug.toLowerCase() === toolkit && item.status === "ACTIVE" && !item.is_disabled);
    return account ? { connected: true as const, accountId: account.id } : { connected: false as const };
  }

  async createCalendarLink(userId: string, authConfigId: string, callbackUrl: string) {
    return this.createConnectionLink(userId, authConfigId, callbackUrl, "calendar");
  }

  private async createConnectionLink(userId: string, authConfigId: string, callbackUrl: string, alias: string) {
    if (!/^ac_[A-Za-z0-9_-]+$/.test(authConfigId)) throw new Error("Composio auth config is invalid");
    const response = await this.fetcher("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "x-api-key": this.apiKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId, auth_config_id: authConfigId, callback_url: callbackUrl, alias: `yukti-${alias}-${userId}` }),
    });
    if (!response.ok) throw new Error(`Composio link request failed with status ${response.status}`);
    const data = linkResponse.parse(await response.json());
    return { redirectUrl: data.redirect_url, connectionId: data.connected_account_id ?? data.id ?? null };
  }

  async listCalendarEvents(userId: string, accountId: string, timeMin: string, timeMax: string) {
    return this.execute("GOOGLECALENDAR_EVENTS_LIST", userId, accountId, {
      calendarId: "primary", singleEvents: true, orderBy: "startTime", maxResults: 50, timeMin, timeMax,
    });
  }

  private async execute(tool: string, userId: string, accountId: string, args: Record<string, unknown>) {
    const response = await this.fetcher(`https://backend.composio.dev/api/v3.1/tools/execute/${tool}`, {
      method: "POST", signal: AbortSignal.timeout(20_000),
      headers: { "x-api-key": this.apiKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId, connected_account_id: accountId, version: "latest", arguments: args }),
    });
    if (!response.ok) throw new Error(`Composio tool request failed with status ${response.status}`);
    const parsed = executeResponse.parse(await response.json());
    if (!parsed.successful) throw new Error("Composio tool execution failed");
    return parsed.data;
  }
}
