import { conciergeReply, parseConciergeMessage } from "../domain/concierge";
import { LinqClient } from "../providers/linq/client";
import { isAllowedLinqLineEvent, linqInboundEvent, verifyLinqWebhook } from "../providers/linq/webhook";
import { fetchFlowerProducts } from "../providers/products/flowers";
import { SensoClient } from "../providers/senso/client";
import { GeminiFlashClient } from "../providers/gemini/client";
import type { RequestIdentity } from "./identity";
import { resolveLinqUser } from "./onboarding-handler";

export type ConciergeEnv = {
  DB: D1Database;
  YUKTI_MODE?: string;
  LINQ_API_TOKEN?: string;
  LINQ_PHONE_NUMBER?: string;
  LINQ_OWNER_PHONE?: string;
  LINQ_WEBHOOK_SECRET?: string;
  YUKTI_OWNER_GITHUB_LOGIN?: string;
  SENSO_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function handleLinqWebhook(request: Request, env: ConciergeEnv) {
  if (!env.LINQ_WEBHOOK_SECRET) return json({ error: "webhook_not_configured" }, 503);
  const rawBody = await request.text();
  if (!await verifyLinqWebhook(env.LINQ_WEBHOOK_SECRET, rawBody, request.headers)) return json({ error: "invalid_signature" }, 401);
  let event;
  try { event = linqInboundEvent.parse(JSON.parse(rawBody)); }
  catch { return json({ error: "unsupported_event" }, 400); }

  if (!env.LINQ_PHONE_NUMBER || !isAllowedLinqLineEvent(event, env.LINQ_PHONE_NUMBER)) {
    return json({ accepted: false, reason: "recipient_not_allowed" }, 202);
  }

  const phone = event.data.sender_handle.handle;
  const text = event.data.parts.filter((part): part is { type: "text"; value: string } => part.type === "text").map((part) => part.value).join("\n").trim().slice(0, 4_000);
  if (!text) return json({ accepted: true, ignored: "no_text" }, 200);
  const resolved = await resolveLinqUser(env.DB, phone, text);
  if (!resolved) return json({ accepted: false, reason: "number_not_connected" }, 202);
  const owner = resolved.user;

  const receipt = await env.DB.prepare(`INSERT OR IGNORE INTO webhook_receipts (event_id, provider, event_type, received_at) VALUES (?, 'linq', ?, ?)`)
    .bind(event.event_id, event.event_type, new Date().toISOString()).run();
  if ((receipt.meta.changes ?? 0) === 0) return json({ accepted: true, duplicate: true }, 200);

  const now = new Date().toISOString();
  const conversationId = await ensureConversation(env.DB, owner.id, event.data.chat.id, phone, now);
  if (resolved.pairedNow) {
    const welcome = "You're connected to Yukti. Next, add someone you care about in the app or text me who they are and what they like.";
    if (env.LINQ_API_TOKEN) {
      try {
        const sent = await new LinqClient(env.LINQ_API_TOKEN, env.LINQ_PHONE_NUMBER).sendApprovedMessage(phone, welcome);
        await env.DB.prepare(`INSERT INTO messages (id, user_id, conversation_id, provider_event_id, provider_message_id, direction, body, processing_state, created_at, updated_at)
          VALUES (?, ?, ?, NULL, ?, 'outbound', ?, 'sent', ?, ?)`).bind(crypto.randomUUID(), owner.id, conversationId, sent.messageId, welcome, now, now).run();
      } catch { /* Pairing remains valid even if the confirmation reply is unavailable. */ }
    }
    return json({ accepted: true, paired: true }, 200);
  }
  const messageId = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO messages (id, user_id, conversation_id, provider_event_id, provider_message_id, direction, body, processing_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'inbound', ?, 'processing', ?, ?)`)
    .bind(messageId, owner.id, conversationId, event.event_id, event.data.id, text, now, now).run();

  const parsed = parseConciergeMessage(text);
  for (const learned of parsed.facts) await persistFact(env.DB, owner.id, learned, messageId, event.event_id, now);
  if (parsed.rule) await persistRule(env.DB, owner.id, parsed.rule, now);
  if (parsed.optOut) await env.DB.batch([
    env.DB.prepare(`UPDATE concierge_profiles SET proactive_enabled = 0, updated_at = ? WHERE user_id = ?`).bind(now, owner.id),
    env.DB.prepare(`UPDATE proactive_rules SET enabled = 0, updated_at = ? WHERE user_id = ?`).bind(now, owner.id),
  ]);
  await env.DB.prepare(`UPDATE messages SET processing_state = 'processed', updated_at = ? WHERE id = ?`).bind(new Date().toISOString(), messageId).run();

  const reply = conciergeReply(parsed);
  if (env.LINQ_API_TOKEN) {
    try {
      const sent = await new LinqClient(env.LINQ_API_TOKEN, env.LINQ_PHONE_NUMBER).sendApprovedMessage(phone, reply);
      const sentAt = new Date().toISOString();
      await env.DB.prepare(`INSERT INTO messages (id, user_id, conversation_id, provider_event_id, provider_message_id, direction, body, processing_state, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, 'outbound', ?, 'sent', ?, ?)`)
        .bind(crypto.randomUUID(), owner.id, conversationId, sent.messageId, reply, sentAt, sentAt).run();
    } catch {
      await env.DB.prepare(`INSERT INTO audit_events (id, user_id, event_id, kind, detail, created_at, updated_at) VALUES (?, ?, NULL, 'linq.reply_failed', ?, ?, ?)`)
        .bind(crypto.randomUUID(), owner.id, JSON.stringify({ inboundEventId: event.event_id }), now, now).run();
    }
  }
  return json({ accepted: true, learned: parsed.facts.length, ruleCreated: Boolean(parsed.rule) }, 200);
}

export async function handleConciergeRequest(request: Request, env: ConciergeEnv, identity: RequestIdentity): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/concierge")) return null;
  const now = new Date().toISOString();

  if (url.pathname === "/api/concierge" && request.method === "GET") return json(await connectedSnapshot(env.DB, identity.id), 200);
  if (url.pathname === "/api/concierge/facts" && request.method === "POST") return createFact(request, env.DB, identity.id, now);
  if (url.pathname === "/api/concierge/facts/update" && request.method === "POST") return updateFact(request, env.DB, identity.id, now);
  if (url.pathname === "/api/concierge/facts/delete" && request.method === "POST") return deleteFact(request, env.DB, identity.id, now);
  if (url.pathname === "/api/concierge/rules" && request.method === "POST") return createRule(request, env.DB, identity.id, now);
  if (url.pathname === "/api/concierge/rules/toggle" && request.method === "POST") return toggleRule(request, env.DB, identity.id, now);
  if (url.pathname === "/api/concierge/scan" && request.method === "POST") return scanForFlowers(request, env, identity.id, now);
  return json({ error: "not_found" }, 404);
}

async function connectedSnapshot(db: D1Database, userId: string) {
  const [people, facts, rules, messages, products, activity] = await Promise.all([
    db.prepare(`SELECT id, name, relationship, notes, updated_at AS updatedAt FROM people WHERE user_id = ? ORDER BY updated_at DESC`).bind(userId).all(),
    db.prepare(`SELECT id, person_id AS personId, fact, kind, value, status, origin, source, confidence, created_at AS createdAt FROM memory_facts WHERE user_id = ? ORDER BY created_at DESC`).bind(userId).all(),
    db.prepare(`SELECT r.id, r.person_id AS personId, p.name AS personName, r.kind, r.cadence_days AS cadenceDays, r.maximum_amount_minor AS maximumAmountMinor, r.currency, r.enabled, r.next_eligible_at AS nextEligibleAt, r.last_prepared_at AS lastPreparedAt FROM proactive_rules r JOIN people p ON p.id = r.person_id WHERE r.user_id = ? ORDER BY r.created_at DESC`).bind(userId).all(),
    db.prepare(`SELECT direction, body, processing_state AS processingState, created_at AS createdAt FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 12`).bind(userId).all(),
    db.prepare(`SELECT s.id, s.rule_id AS ruleId, p.name AS personName, s.merchant, s.title, s.amount_minor AS amountMinor, s.currency, s.url, s.image_url AS imageUrl, s.availability, s.source_kind AS sourceKind, s.evidence, s.retrieved_at AS retrievedAt FROM product_snapshots s LEFT JOIN proactive_rules r ON r.id = s.rule_id LEFT JOIN people p ON p.id = r.person_id WHERE s.user_id = ? AND s.evidence LIKE '%"groundedResearch"%' ORDER BY s.retrieved_at DESC LIMIT 3`).bind(userId).all(),
    db.prepare(`SELECT kind, detail, created_at AS createdAt FROM audit_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`).bind(userId).all(),
  ]);
  return { mode: "connected", people: people.results, facts: facts.results, rules: rules.results, messages: messages.results, products: products.results, activity: activity.results };
}

async function createFact(request: Request, db: D1Database, userId: string, now: string) {
  const body = await bodyJson(request); const personName = string(body.personName, 40); const value = string(body.value, 120);
  const kind = ["relationship", "preference", "budget", "location", "note"].includes(String(body.kind)) ? String(body.kind) : "note";
  if (!personName || !value) return json({ error: "person_and_value_required" }, 400);
  const personId = await ensurePerson(db, userId, personName, kind === "relationship" ? value : "Someone you care about", now);
  const learned = { personName, kind, value, origin: "explicit", confidence: 100 } as const;
  await persistFact(db, userId, learned, null, "web-console", now, personId);
  return json({ saved: true }, 201);
}

async function updateFact(request: Request, db: D1Database, userId: string, now: string) {
  const body = await bodyJson(request); const id = string(body.id, 80); const value = string(body.value, 120);
  if (!id || !value) return json({ error: "fact_and_value_required" }, 400);
  const result = await db.prepare(`UPDATE memory_facts SET value = ?, fact = ?, status = 'confirmed', origin = 'explicit', confidence = 100, updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(value, value, now, id, userId).run();
  return (result.meta.changes ?? 0) === 1 ? json({ saved: true }, 200) : json({ error: "fact_not_found" }, 404);
}

async function deleteFact(request: Request, db: D1Database, userId: string, now: string) {
  const body = await bodyJson(request); const id = string(body.id, 80); if (!id) return json({ error: "fact_required" }, 400);
  const result = await db.prepare(`DELETE FROM memory_facts WHERE id = ? AND user_id = ?`).bind(id, userId).run();
  if ((result.meta.changes ?? 0) !== 1) return json({ error: "fact_not_found" }, 404);
  await db.prepare(`INSERT INTO audit_events (id, user_id, event_id, kind, detail, created_at, updated_at) VALUES (?, ?, NULL, 'memory.deleted', ?, ?, ?)`)
    .bind(crypto.randomUUID(), userId, JSON.stringify({ factId: id }), now, now).run();
  return json({ deleted: true }, 200);
}

async function createRule(request: Request, db: D1Database, userId: string, now: string) {
  const body = await bodyJson(request); const personName = string(body.personName, 40);
  const cadenceDays = integer(body.cadenceDays, 7, 365); const maximumAmountMinor = integer(body.maximumAmountMinor, 1000, 100_000);
  if (!personName || !cadenceDays || !maximumAmountMinor) return json({ error: "valid_rule_required" }, 400);
  await persistRule(db, userId, { personName, cadenceDays, maximumAmountMinor, currency: "USD" }, now);
  return json({ saved: true }, 201);
}

async function toggleRule(request: Request, db: D1Database, userId: string, now: string) {
  const body = await bodyJson(request); const id = string(body.id, 80); const enabled = body.enabled === true ? 1 : body.enabled === false ? 0 : null;
  if (!id || enabled === null) return json({ error: "rule_and_state_required" }, 400);
  const result = await db.prepare(`UPDATE proactive_rules SET enabled = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(enabled, now, id, userId).run();
  return (result.meta.changes ?? 0) === 1 ? json({ saved: true }, 200) : json({ error: "rule_not_found" }, 404);
}

async function scanForFlowers(request: Request, env: ConciergeEnv, userId: string, now: string) {
  const body = await bodyJson(request); const send = body.send === true;
  const rule = await env.DB.prepare(`SELECT r.id, r.person_id, p.name AS person_name, r.cadence_days, r.maximum_amount_minor, r.currency FROM proactive_rules r JOIN people p ON p.id = r.person_id WHERE r.user_id = ? AND r.enabled = 1 AND r.next_eligible_at <= ? ORDER BY r.next_eligible_at LIMIT 1`)
    .bind(userId, now).first<{ id: string; person_id: string; person_name: string; cadence_days: number; maximum_amount_minor: number; currency: string }>();
  if (!rule) return json({ state: "nothing_due" }, 200);
  let products;
  try { products = await fetchFlowerProducts(rule.maximum_amount_minor); }
  catch { return json({ error: "merchant_catalog_unavailable" }, 502); }
  if (!products.length) return json({ state: "no_product_within_budget" }, 200);

  const preferences = await env.DB.prepare(`SELECT value FROM memory_facts WHERE user_id = ? AND person_id = ? AND kind = 'preference' AND status = 'confirmed' ORDER BY updated_at DESC`).bind(userId, rule.person_id).all<{ value: string }>();
  const location = await env.DB.prepare(`SELECT value FROM memory_facts WHERE user_id = ? AND person_id = ? AND kind = 'location' AND status = 'confirmed' ORDER BY updated_at DESC LIMIT 1`).bind(userId, rule.person_id).first<{ value: string }>();
  if (!location?.value) return json({ state: "missing_location", personName: rule.person_name }, 200);
  let sensoReferences: string[] = [];
  let sensoWords: string[] = [];
  if (env.SENSO_API_KEY) {
    try {
      const memories = await new SensoClient(env.SENSO_API_KEY).searchMemory(`What gift or flower preferences are known about ${rule.person_name}?`);
      sensoReferences = memories.map((item) => item.contentId);
      sensoWords = memories.flatMap((item) => item.text.toLowerCase().split(/\W+/)).filter((word) => word.length > 4);
    }
    catch { sensoReferences = []; }
  }
  const preferenceWords = preferences.results.flatMap((item) => item.value.toLowerCase().split(/\W+/)).filter((word) => word.length > 3);
  const ranked = products.map((product) => ({ product, score: preferenceWords.filter((word) => product.title.toLowerCase().includes(word)).length * 2 + sensoWords.filter((word) => product.title.toLowerCase().includes(word)).length })).sort((a, b) => b.score - a.score || a.product.amountMinor - b.product.amountMinor);
  const selected = ranked[0].product; const snapshotId = crypto.randomUUID();
  let groundedResearch;
  try {
    if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured");
    groundedResearch = await new GeminiFlashClient(env.GEMINI_API_KEY, env.GEMINI_MODEL).researchCurrentProduct({
      personName: rule.person_name, location: location.value, maximumAmountMinor: rule.maximum_amount_minor,
      preferences: preferences.results.map((item) => item.value), product: selected,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message.replace(/AIza[\w-]+/g, "[redacted]").slice(0, 180) : "unknown_grounding_failure";
    return json({ error: "grounded_search_unavailable", reason }, 502);
  }
  const evidence = JSON.stringify({ catalog: "FTD public flowers catalog", deliveryLocation: location.value, deliveryTiming: "as soon as available", preferenceFacts: preferences.results.map((item) => item.value), sensoContentIds: sensoReferences, groundedResearch, ranking: "explicit and Senso preference matches, then lowest starting price", deliveryBoundary: "Merchant must confirm the exact address and delivery date before checkout" });
  await env.DB.prepare(`INSERT INTO product_snapshots (id, user_id, rule_id, merchant, merchant_product_id, title, amount_minor, currency, url, image_url, availability, source_kind, evidence, retrieved_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live_merchant', ?, ?, ?, ?)`)
    .bind(snapshotId, userId, rule.id, selected.merchant, selected.merchantProductId, selected.title, selected.amountMinor, selected.currency, selected.url, selected.imageUrl, selected.availability, evidence, selected.retrievedAt, now, now).run();
  if (send) {
    const nextEligibleAt = new Date(Date.parse(now) + rule.cadence_days * 86_400_000).toISOString();
    await env.DB.prepare(`UPDATE proactive_rules SET last_prepared_at = ?, next_eligible_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(now, nextEligibleAt, now, rule.id, userId).run();
  } else {
    await env.DB.prepare(`UPDATE proactive_rules SET last_prepared_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(now, now, rule.id, userId).run();
  }

  let messageSent = false;
  const profile = await env.DB.prepare("SELECT phone_e164 AS phone FROM concierge_profiles WHERE user_id = ? LIMIT 1").bind(userId).first<{ phone: string }>();
  if (send && env.LINQ_API_TOKEN && env.LINQ_PHONE_NUMBER && profile?.phone) {
    const amount = (selected.amountMinor / 100).toFixed(0);
    await new LinqClient(env.LINQ_API_TOKEN, env.LINQ_PHONE_NUMBER).sendApprovedMessage(profile.phone,
      `It has been a while since you planned flowers for ${rule.person_name}. I found ${selected.title} at ${selected.merchant}, starting at $${amount} USD. I saved the live option in Yukti for you to review.`);
    messageSent = true;
  }
  return json({ state: "prepared", product: { id: snapshotId, ...selected, evidence: JSON.parse(evidence) }, messageSent }, 200);
}

async function persistFact(db: D1Database, userId: string, learned: { personName: string; kind: string; value: string; origin: string; confidence: number }, sourceMessageId: string | null, sourceEventId: string, now: string, knownPersonId?: string) {
  const personId = knownPersonId ?? await ensurePerson(db, userId, learned.personName, learned.kind === "relationship" ? learned.value : "Someone you care about", now);
  if (learned.kind === "relationship") await db.prepare(`UPDATE people SET relationship = ?, updated_at = ? WHERE id = ? AND user_id = ?`).bind(learned.value, now, personId, userId).run();
  const existing = await db.prepare(`SELECT id FROM memory_facts WHERE user_id = ? AND person_id = ? AND kind = ? AND value = ?`).bind(userId, personId, learned.kind, learned.value).first<{ id: string }>();
  const sentence = learned.kind === "relationship" ? `${learned.personName} is your ${learned.value}` : learned.kind === "budget" ? `${learned.personName}'s budget is $${Number(learned.value.split(" ")[0]) / 100}` : learned.kind === "location" ? `${learned.personName} lives in ${learned.value}` : `${learned.personName} likes ${learned.value}`;
  if (existing) return db.prepare(`UPDATE memory_facts SET status = 'confirmed', origin = ?, source_message_id = ?, source = ?, confidence = ?, updated_at = ? WHERE id = ?`).bind(learned.origin, sourceMessageId, `Linq ${sourceEventId.slice(0, 8)}`, learned.confidence, now, existing.id).run();
  return db.prepare(`INSERT INTO memory_facts (id, user_id, person_id, fact, kind, value, status, origin, source_message_id, source, confidence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), userId, personId, sentence, learned.kind, learned.value, learned.origin, sourceMessageId, `Linq ${sourceEventId.slice(0, 8)}`, learned.confidence, now, now).run();
}

async function persistRule(db: D1Database, userId: string, rule: { personName: string; cadenceDays: number; maximumAmountMinor: number; currency: string }, now: string) {
  const personId = await ensurePerson(db, userId, rule.personName, "Someone you care about", now);
  const existing = await db.prepare(`SELECT id FROM proactive_rules WHERE user_id = ? AND person_id = ? AND kind = 'flowers'`).bind(userId, personId).first<{ id: string }>();
  if (existing) return db.prepare(`UPDATE proactive_rules SET cadence_days = ?, maximum_amount_minor = ?, currency = ?, enabled = 1, next_eligible_at = ?, updated_at = ? WHERE id = ?`).bind(rule.cadenceDays, rule.maximumAmountMinor, rule.currency, now, now, existing.id).run();
  return db.prepare(`INSERT INTO proactive_rules (id, user_id, person_id, kind, cadence_days, maximum_amount_minor, currency, enabled, next_eligible_at, last_prepared_at, created_at, updated_at) VALUES (?, ?, ?, 'flowers', ?, ?, ?, 1, ?, NULL, ?, ?)`)
    .bind(crypto.randomUUID(), userId, personId, rule.cadenceDays, rule.maximumAmountMinor, rule.currency, now, now, now).run();
}

async function ensurePerson(db: D1Database, userId: string, rawName: string, relationship: string, now: string) {
  const name = rawName.trim().slice(0, 40); const existing = await db.prepare(`SELECT id FROM people WHERE user_id = ? AND lower(name) = lower(?)`).bind(userId, name).first<{ id: string }>();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO people (id, user_id, name, relationship, notes, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)`).bind(id, userId, name, relationship, now, now).run();
  return id;
}

async function ensureConversation(db: D1Database, userId: string, providerChatId: string, phone: string, now: string) {
  const existing = await db.prepare(`SELECT id FROM conversations WHERE provider_chat_id = ? AND user_id = ?`).bind(providerChatId, userId).first<{ id: string }>();
  if (existing) return existing.id;
  const id = crypto.randomUUID(); await db.prepare(`INSERT INTO conversations (id, user_id, provider, provider_chat_id, participant_e164, status, created_at, updated_at) VALUES (?, ?, 'linq', ?, ?, 'active', ?, ?)`).bind(id, userId, providerChatId, phone, now, now).run(); return id;
}

async function bodyJson(request: Request): Promise<Record<string, unknown>> { try { return await request.json() as Record<string, unknown>; } catch { return {}; } }
function string(value: unknown, length: number) { return typeof value === "string" ? value.trim().slice(0, length) : ""; }
function integer(value: unknown, minimum: number, maximum: number) { const number = Number(value); return Number.isInteger(number) && number >= minimum && number <= maximum ? number : 0; }
function json(body: unknown, status: number) { return new Response(JSON.stringify(body), { status, headers }); }
