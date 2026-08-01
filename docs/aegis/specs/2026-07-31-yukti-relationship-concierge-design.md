# Yukti Relationship Concierge Design

Date: `2026-07-31`
Status: `approved for implementation`

## Outcome

Yukti is an iMessage concierge that learns the people a user cares about, notices useful moments to act, finds real products, and prepares an exact purchase for approval. The website is the memory, rule, approval, and audit console. Linq is the everyday interface.

The first connected vertical is flowers because it supports one-off gifts, relationship cadence, and repeat intent while keeping the product contract narrow enough to verify. Other gift categories remain possible through the same product-source contract.

## Connected Demo

1. The verified Yukti owner texts the Linq number about Sarah.
2. Yukti asks only for missing relationship, preference, occasion, or budget details.
3. Explicit facts are saved immediately with message provenance. Model-derived facts remain proposed until the owner confirms them.
4. The website shows Sarah, the learned facts, their origin, and edit or delete controls.
5. A manual or scheduled scan finds an upcoming occasion or an overdue flower cadence.
6. Yukti retrieves current products from an allowlisted real merchant source, records the retrieval time and URL, and uses Senso evidence in ranking.
7. Linq sends one recommendation with price and reason. It does not put a URL in a first-contact message.
8. The owner approves an exact item and amount. Yukti creates a short-lived Prava session and preserves the existing no-blind-retry transaction rules.

## Domain Contracts

- `Conversation`: one user-owned Linq chat, its provider chat ID, verified participant, state, and timestamps.
- `Message`: one inbound or outbound message with provider event and message IDs, direction, redacted text, processing state, and timestamps.
- `Person`: a user-owned relationship with name, relationship label, aliases, and status.
- `MemoryFact`: a typed value about a person or the owner, marked `explicit` or `inferred`, with status, confidence, provenance message, source label, and timestamps.
- `ProactiveRule`: a user-owned rule such as flowers for Sarah every 28 days, including quiet hours, next eligibility, maximum amount, currency, and enabled state.
- `ProductSnapshot`: a current, attributable merchant product with URL, image, price, currency, availability, retrieval time, and source kind.
- `PurchaseHistory`: a non-sensitive record of an approved or completed action used to compute cadence. It never contains card data or scoped credentials.

## Memory Rules

- Statements the user makes directly are explicit facts.
- Inferences are stored as `proposed`, never silently promoted to truth.
- Every fact is user-scoped and points to its originating message or connected source.
- The user can edit, confirm, or delete facts from the console.
- Raw unrelated iMessage history is never imported. Yukti retains only messages sent to its Linq line and only the text needed for the active concierge relationship.
- Deleting a fact removes it from future recommendation context. Audit records keep only the fact ID and action, not the deleted value.

## Linq Webhook Boundary

- Use Linq v3 with webhook payload version `2026-02-03`.
- Verify Standard Webhooks signatures over the raw body using the one-time subscription signing secret.
- Deduplicate by Linq `event_id` before processing.
- Accept inbound messages only when the owner handle is the configured Yukti line, the chat is direct, and the sender is the configured verified recipient.
- Outbound messages are restricted to that same recipient in the first release.
- Opt-out commands disable proactive sends. Quiet hours and per-rule cadence gate every proactive action.

## Conversation Behavior

The initial parser is deterministic for identity, relationship, preferences, budgets, confirmations, opt-out, and rule commands. Gemini Flash may produce a structured reply and proposed facts when configured, but it cannot bypass recipient checks, confirm inferred facts, enable a rule, create an approval, or spend money.

The bot keeps replies short. It acknowledges what it learned, asks one missing question, or presents one actionable recommendation. It avoids exposing internal provider or orchestration language.

## Real Product Boundary

Products must come from an allowlisted public merchant page at request time or a recent attributable snapshot. Each product includes its canonical merchant URL and retrieval timestamp. If live retrieval fails, Yukti shows the last verified snapshot as stale and does not claim current stock or delivery.

The first adapter is flowers-only. It rejects missing canonical URLs, missing prices, unsupported currencies, and products over the active budget. Senso evidence must affect the displayed rationale or rejection record; it is not a decorative badge.

## Proactive Rules

A rule becomes eligible only when it is enabled, outside quiet hours, past `nextEligibleAt`, and no open recommendation exists for the same person and rule. An upcoming connected calendar event may also trigger eligibility. A scan prepares at most one recommendation per rule.

Recurring behavior means recurring preparation and reminder. Every purchase still requires a fresh exact approval until Prava exposes and Yukti verifies a recurring mandate contract. No automatic subscription or repeated charge is implemented by assumption.

## Public And Private Access

GitHub authentication remains available for judges, but connected owner data is available only to the mapped owner identity. Judges receive seeded data and cannot access the founders Calendar, Linq conversation, recipient phone, memory, or proactive rules. Mutation routes enforce ownership server-side.

## Jobs

ChatGPT Sites has no assumed scheduler. A signed `POST /api/jobs/proactive-scan` route supports attended demo execution and a future free scheduler. The console also exposes a user-authenticated manual scan. Both paths call the same idempotent service.

## Acceptance

- A valid signed Linq inbound webhook creates one message exactly once.
- An invalid signature, group chat, unknown sender, or replay has no domain effect.
- An inbound owner message can create or update Sarah and explicit memory.
- Inferred memory remains proposed until confirmed.
- Memory can be edited and deleted in the authenticated console.
- A proactive rule can be created, disabled, and scanned without charging or purchasing.
- A scan returns at least one real attributable flower product or an honest unavailable state.
- An eligible recommendation can be sent through Linq only to the configured owner phone.
- The existing exact approval and Prava sandbox handoff remains the only purchase path.
- Unit, type, lint, build, desktop, phone, keyboard, console, and public smoke checks pass.

## Non-goals

- Reading unrelated iMessage history
- Sending to arbitrary phone numbers
- Automatic recurring charges
- General web shopping or arbitrary browser checkout
- Exposing shared Composio or Linq credentials to public users
- Claiming live stock, delivery, or transaction completion without current evidence

## Self-review

The design has one owner for each durable fact, message, rule, product snapshot, and transaction. It preserves the existing payment invariant, makes the connected-versus-seeded boundary explicit, and contains no placeholder behavior that must be invented during implementation.
