import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), chatgptUserId: text("chatgpt_user_id").notNull().unique(),
  displayName: text("display_name").notNull(), timezone: text("timezone").notNull().default("America/Vancouver"), ...timestamps,
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
  fact: text("fact").notNull(), source: text("source").notNull(), confidence: integer("confidence").notNull(), ...timestamps,
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
