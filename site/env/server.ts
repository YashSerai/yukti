import { z } from "zod";

const optionalUrl = z.string().url().optional();

const serverEnvSchema = z.object({
  YUKTI_MODE: z.enum(["development", "seeded", "sandbox", "connected"]).default("seeded"),
  YUKTI_APP_URL: optionalUrl,
  YUKTI_DEMO_USER_ID: z.string().min(1).optional(),
  YUKTI_DEMO_USER_EMAIL: z.string().email().optional(),
  PRAVA_SECRET_KEY: z.string().startsWith("sk_test_").optional(),
  COMPOSIO_API_KEY: z.string().min(1).optional(),
  COMPOSIO_GOOGLE_CALENDAR_AUTH_CONFIG_ID: z.string().regex(/^ac_[A-Za-z0-9_-]+$/).optional(),
  SENSO_API_KEY: z.string().min(1).optional(),
  LINQ_API_TOKEN: z.string().min(1).optional(),
  LINQ_PHONE_NUMBER: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  COMPOSIO_USER_ID: z.string().min(1).optional(),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).optional(),
  GOOGLE_CLOUD_LOCATION: z.string().min(1).default("us-central1"),
  GEMINI_MODEL: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CALLBACK_URL: optionalUrl,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function requirePravaEnv(source?: Record<string, string | undefined>) {
  const env = readServerEnv(source);
  return z.object({
    PRAVA_SECRET_KEY: z.string().startsWith("sk_test_"),
    YUKTI_DEMO_USER_ID: z.string().min(1),
    YUKTI_DEMO_USER_EMAIL: z.string().email(),
  }).parse(env);
}
