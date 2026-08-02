import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = (includeLocalSecrets: boolean) => ({
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  vars: {
    YUKTI_MODE: process.env.YUKTI_MODE ?? "seeded",
    ...(process.env.YUKTI_APP_URL ? { YUKTI_APP_URL: process.env.YUKTI_APP_URL } : {}),
    ...(includeLocalSecrets && process.env.PRAVA_SECRET_KEY ? { PRAVA_SECRET_KEY: process.env.PRAVA_SECRET_KEY } : {}),
    ...(includeLocalSecrets && process.env.GEMINI_API_KEY ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY } : {}),
    ...(includeLocalSecrets && process.env.SENSO_API_KEY ? { SENSO_API_KEY: process.env.SENSO_API_KEY } : {}),
    ...(includeLocalSecrets && process.env.LINQ_API_TOKEN ? { LINQ_API_TOKEN: process.env.LINQ_API_TOKEN } : {}),
    ...(process.env.LINQ_PHONE_NUMBER ? { LINQ_PHONE_NUMBER: process.env.LINQ_PHONE_NUMBER } : {}),
    ...(process.env.LINQ_OWNER_PHONE ? { LINQ_OWNER_PHONE: process.env.LINQ_OWNER_PHONE } : {}),
    ...(includeLocalSecrets && process.env.LINQ_WEBHOOK_SECRET ? { LINQ_WEBHOOK_SECRET: process.env.LINQ_WEBHOOK_SECRET } : {}),
    ...(includeLocalSecrets && process.env.COMPOSIO_API_KEY ? { COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY } : {}),
    ...(process.env.COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID ? { COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID: process.env.COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID } : {}),
    ...(includeLocalSecrets && process.env.YUKTI_SCHEDULER_SECRET ? { YUKTI_SCHEDULER_SECRET: process.env.YUKTI_SCHEDULER_SECRET } : {}),
    ...(process.env.COMPOSIO_USER_ID ? { COMPOSIO_USER_ID: process.env.COMPOSIO_USER_ID } : {}),
    ...(process.env.GITHUB_CLIENT_ID ? { GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID } : {}),
    ...(includeLocalSecrets && process.env.GITHUB_CLIENT_SECRET ? { GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET } : {}),
    ...(process.env.GITHUB_CALLBACK_URL ? { GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL } : {}),
    ...(process.env.YUKTI_OWNER_GITHUB_LOGIN ? { YUKTI_OWNER_GITHUB_LOGIN: process.env.YUKTI_OWNER_GITHUB_LOGIN } : {}),
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
});

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig(command === "serve"),
      }),
    ],
  };
});
