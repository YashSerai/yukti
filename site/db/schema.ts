import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), chatgptUserId: text("chatgpt_user_id").notNull().unique(),
  displayName: text("display_name").notNull(), timezone: text("timezone").notNull().default("America/Vancouver"), onboardingCompletedAt: text("onboarding_completed_at"), ...timestamps,
});
export const people = sqliteTable("people", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), relationship: text("relationship").notNull(), notes: text("notes"), ...timestamps,
});
export const events = sqliteTable("events", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), personId: text("person_id").references(() => people.id),
  title: text("title").notNull(), startsAt: text("starts_at").notNull(), source: text("source").notNull(), status: text("status").notNull(), ...timestamps,
});
export const memoryFacts = sqliteTable("memory_facts", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), personId: text("person_id").references(() => people.id),
  fact: text("fact").notNull(), kind: text("kind").notNull().default("note"), value: text("value"),
  status: text("status").notNull().default("confirmed"), origin: text("origin").notNull().default("seeded"),
  sourceMessageId: text("source_message_id"), source: text("source").notNull(), confidence: integer("confidence").notNull(), ...timestamps,
});
export const preparationPlans = sqliteTable("preparation_plans", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull().references(() => events.id), state: text("state").notNull(),
  deadlineAt: text("deadline_at"), summary: text("summary").notNull(), ...timestamps,
});
export const candidates = sqliteTable("candidates", {
  id: text("id").primaryKey(), planId: text("plan_id").notNull().references(() => preparationPlans.id), merchant: text("merchant").notNull(),
  title: text("title").notNull(), amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(),
  url: text("url").notNull(), evidence: text("evidence").notNull(), ...timestamps,
});
export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), eventId: text("event_id").notNull().references(() => events.id),
  candidateId: text("candidate_id").notNull().references(() => candidates.id), merchant: text("merchant").notNull(),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(), expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"), ...timestamps,
});
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), approvalId: text("approval_id").notNull().references(() => approvals.id), pravaSessionId: text("prava_session_id"),
  merchantReference: text("merchant_reference"), state: text("state").notNull(), failureCode: text("failure_code"), ...timestamps,
});
export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), eventId: text("event_id").references(() => events.id),
  kind: text("kind").notNull(), detail: text("detail").notNull(), ...timestamps,
});
export const githubIdentities = sqliteTable("github_identities", {
  providerSubject: text("provider_subject").primaryKey(), userId: text("user_id").notNull().unique().references(() => users.id),
  login: text("login").notNull(), displayName: text("display_name"), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});
export const webLoginAttempts = sqliteTable("web_login_attempts", {
  stateHash: text("state_hash").primaryKey(), codeVerifier: text("code_verifier").notNull(), returnTo: text("return_to").notNull(),
  expiresAt: integer("expires_at").notNull(), consumedAt: integer("consumed_at"), createdAt: integer("created_at").notNull(),
});
export const webSessions = sqliteTable("web_sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at").notNull(), revokedAt: integer("revoked_at"), createdAt: integer("created_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), attemptCount: integer("attempt_count").notNull(), windowExpiresAt: integer("window_expires_at").notNull(),
});

export const conciergeProfiles = sqliteTable("concierge_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id), phoneE164: text("phone_e164").notNull().unique(),
  proactiveEnabled: integer("proactive_enabled", { mode: "boolean" }).notNull().default(true),
  quietStartHour: integer("quiet_start_hour").notNull().default(21), quietEndHour: integer("quiet_end_hour").notNull().default(8), ...timestamps,
});
export const linqPairings = sqliteTable("linq_pairings", {
  userId: text("user_id").primaryKey().references(() => users.id), phoneE164: text("phone_e164").notNull().unique(),
  codeHash: text("code_hash").notNull(), expiresAt: integer("expires_at").notNull(), verifiedAt: integer("verified_at"),
  attemptCount: integer("attempt_count").notNull().default(0), ...timestamps,
});
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), provider: text("provider").notNull(),
  providerChatId: text("provider_chat_id").notNull().unique(), participantE164: text("participant_e164").notNull(), status: text("status").notNull(), ...timestamps,
});
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), conversationId: text("conversation_id").notNull().references(() => conversations.id),
  providerEventId: text("provider_event_id").unique(), providerMessageId: text("provider_message_id"), direction: text("direction").notNull(),
  body: text("body").notNull(), processingState: text("processing_state").notNull(), ...timestamps,
});
export const webhookReceipts = sqliteTable("webhook_receipts", {
  eventId: text("event_id").primaryKey(), provider: text("provider").notNull(), eventType: text("event_type").notNull(), receivedAt: text("received_at").notNull(),
});
export const proactiveRules = sqliteTable("proactive_rules", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), personId: text("person_id").notNull().references(() => people.id),
  kind: text("kind").notNull(), cadenceDays: integer("cadence_days").notNull(), maximumAmountMinor: integer("maximum_amount_minor").notNull(),
  currency: text("currency").notNull(), enabled: integer("enabled", { mode: "boolean" }).notNull().default(true), nextEligibleAt: text("next_eligible_at").notNull(),
  lastPreparedAt: text("last_prepared_at"), ...timestamps,
});
export const productSnapshots = sqliteTable("product_snapshots", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), ruleId: text("rule_id").references(() => proactiveRules.id),
  merchant: text("merchant").notNull(), merchantProductId: text("merchant_product_id").notNull(), title: text("title").notNull(),
  amountMinor: integer("amount_minor").notNull(), currency: text("currency").notNull(), url: text("url").notNull(), imageUrl: text("image_url"),
  availability: text("availability").notNull(), sourceKind: text("source_kind").notNull(), evidence: text("evidence").notNull(), retrievedAt: text("retrieved_at").notNull(), ...timestamps,
});

export const taskDetails = sqliteTable("task_details", {
  eventId: text("event_id").primaryKey().references(() => events.id), userId: text("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), description: text("description"), actionState: text("action_state").notNull().default("watching"),
  requiredQuestion: text("required_question"), answer: text("answer"), location: text("location"), externalId: text("external_id"),
  sourceUrl: text("source_url"), sourceDescription: text("source_description"),
  enrichmentFingerprint: text("enrichment_fingerprint"), enrichedAt: text("enriched_at"), ...timestamps,
});
export const connectionSyncs = sqliteTable("connection_syncs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), provider: text("provider").notNull(),
  connectedAccountId: text("connected_account_id"), lastSyncedAt: text("last_synced_at"), lastError: text("last_error"), ...timestamps,
});
export const conversationStates = sqliteTable("conversation_states", {
  userId: text("user_id").primaryKey().references(() => users.id), personName: text("person_name"), intent: text("intent"),
  missingFields: text("missing_fields").notNull(), collected: text("collected").notNull(), expiresAt: text("expires_at").notNull(), ...timestamps,
});
export const scheduledRuns = sqliteTable("scheduled_runs", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), ruleId: text("rule_id").references(() => proactiveRules.id),
  runKey: text("run_key").notNull().unique(), state: text("state").notNull(), detail: text("detail"), ...timestamps,
});
