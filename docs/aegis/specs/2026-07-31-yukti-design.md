# Yukti Product and Architecture Design

Date: `2026-07-31`
Status: `approved for implementation`

## 1. Product Contract

Yukti is a proactive calendar agent. It identifies upcoming events that require preparation, gathers attributable context, proposes useful commercial actions, asks only necessary questions, grounds recommendations, obtains explicit approval, and completes or enables a transaction through Prava.

The primary demonstration is Sarah's birthday. The event and personal context are seeded for repeatability, while sponsor calls and payment state are represented honestly as real, unavailable, failed, or simulated.

## 2. User Outcome

A user can connect Google, configure messaging and spending preferences, review upcoming preparation needs, converse with Yukti through Linq, approve an exact transaction, complete Prava's secure card and scoped-credential flow, and inspect the resulting receipt, calendar update, memory provenance, and audit trail.

## 3. Core Experience

1. Import an upcoming event.
2. Classify whether preparation is useful.
3. Retrieve only relevant Calendar, Gmail, People, conversation, memory, and purchase context.
4. Produce a structured preparation plan with provenance.
5. Contact the user through Linq when input is needed.
6. Retrieve and compare candidates.
7. Attach Senso evidence for merchant, availability, delivery, return policy, and trust claims.
8. Ensure an action can complete before the event deadline.
9. Present one recommendation and a small number of alternatives.
10. Bind the approval to the selected item, merchant, amount cap, user, and expiry.
11. Create a just-in-time Prava session and collect card approval through Prava's secure surface.
12. Use scoped credentials only in a server-side merchant checkout adapter.
13. Report the merchant result to Prava in every terminal outcome.
14. Store non-sensitive receipt and transaction references, update the calendar, notify the user, and close the audit trail.

## 4. State Machine

The canonical action states are:

`detected -> contextualizing -> needs_input | researching -> ready_for_approval -> approved -> purchasing -> completed | failed | outcome_unknown`

Transitions are deterministic and persisted. Model output may propose a transition but cannot apply it directly. Retrying an uncertain merchant outcome is prohibited until reconciliation proves that no charge succeeded.

## 5. Authorization Invariant

Every purchase approval binds:

- user and event
- candidate and merchant identity
- exact currency and maximum amount
- quantity and material fulfillment details
- expiration and single-use expectation
- evidence snapshot used for the decision

The executor refuses missing, altered, expired, already-consumed, or over-budget approvals. A model, webhook, UI request, or retry cannot bypass this check.

## 6. Data Model

Canonical entities are User, Connection, Event, EventParticipant, Person, MemoryFact, ContextSource, PreparationPlan, ProposedAction, Candidate, TrustEvidence, SpendingRule, Conversation, Message, Approval, PaymentSession, Transaction, Receipt, FollowUpAction, AuditEvent, ProviderCall, Job, and IdempotencyKey.

Memory facts include provenance, confidence, inferred-or-explicit status, timestamps, and edit/delete controls. Raw email bodies are processed transiently and are not retained as durable memory.

## 7. Provider Responsibilities

### Gemini on Vertex AI

Gemini Flash provides structured event classification, context selection, question generation, preparation planning, candidate comparison, recommendation explanation, and conversational interpretation. The selected model must support the required structured output reliably. Gemini 3.1 Pro is forbidden. Total authorized inference spend is USD 20, measured and stopped before the cap.

### Composio

Composio manages Google Calendar, Gmail, and People connections. Yukti uses an explicit allowlist for listing and reading events, updating an event, searching and reading relevant Gmail threads, and retrieving contact data. The model never receives unrestricted Composio tool access.

### Linq

Linq owns proactive and inbound messaging. Webhooks are signed or otherwise authenticated according to Linq's current contract, deduplicated, and converted into domain messages before agent processing. Development sends only to approved sandbox recipients.

### Senso

Senso owns commercial grounding and trust evidence. Its output must materially affect candidate ranking or rejection and remain visible with source and freshness metadata. It does not authorize spending.

### Prava

Prava owns secure card collection, mandate/permission registration, scoped credential issuance, and payment status. Sessions are created only when the user is ready because they expire quickly. Card details and scoped credentials are never rendered, logged, or persisted by Yukti. The app always reports merchant approval or decline to Prava.

## 8. Operating Modes

- `development`: local provider stubs and explicit diagnostics
- `seeded`: deterministic Sarah event and personal context through production orchestration contracts
- `sandbox`: real sponsor sandbox calls and sandbox payment
- `connected`: real Google and Linq context with explicit user authorization

Every screen and audit entry identifies the active mode. Seeded data cannot be presented as a provider response.

## 9. Judge Mode

Judge mode provides a preflight health check, resettable Sarah scenario, step-by-step transaction timeline, real-versus-seeded badges, masked provider references, success and merchant-decline paths, and an exportable evidence summary. It does not bypass authentication, approval, or provider execution.

## 10. User-Facing Surfaces

- Landing and product explanation
- Authentication and onboarding
- Preparation timeline dashboard
- Event workspace
- Messaging and pending approvals
- People and editable memory
- Wallet and spending rules
- Connections and provider health
- Transactions, receipts, and audit log
- Development-only judge controls

Quality-of-life behavior includes agent pause, quiet hours, budget presets, connection recovery, manual scan, provenance explanations, approval expiry, safe retry, demo reset, responsive navigation, and complete loading, empty, partial, error, and success states.

## 11. Security and Privacy

- Validate environment variables on server startup.
- Keep all secret keys and tokens server-side.
- Encrypt sensitive stored connection metadata.
- Use least-privilege Google scopes and a fixed tool allowlist.
- Authenticate and deduplicate webhooks.
- Rate-limit public mutation endpoints.
- Redact provider payloads before logging.
- Never store PAN, CVV, scoped payment credentials, raw email bodies, or unrelated messages.
- Enforce amount and merchant constraints immediately before checkout.

## 12. Hosting Boundary

ChatGPT Sites is the required publishing surface. Implementation first verifies its current support for server execution, environment variables, persistence, OAuth callbacks, inbound HTTPS webhooks, scheduled/background work, and outbound provider requests.

If Sites supports the complete application contract, it hosts the canonical app. If any required backend capability is absent, Sites hosts the complete user-facing experience and a single Cloud Run service owns all server-only behavior. No additional backend is introduced unless this capability test proves it necessary.

## 13. Cost Boundary

No paid plan, production payment, real merchant purchase, or billable third-party operation is authorized except Gemini Flash inference up to USD 20. The build uses sponsor sandboxes and free tiers. A dedicated Yukti Google Cloud project must be used; the existing Soulspace production project is excluded.

## 14. Verification and Acceptance

Acceptance requires:

1. A user can authenticate and connect Google.
2. Events import and enter the generalized state machine.
3. Personal and commercial claims display provenance.
4. Linq supports proactive and inbound conversation.
5. Senso evidence changes or validates a recommendation.
6. An exact approval is required before payment.
7. Prava creates a real sandbox session, collects approval securely, issues scoped credentials, and receives the reported merchant outcome.
8. The calendar, dashboard, receipt, and audit trail reflect the result.
9. The Sarah flow passes an automated browser test and an attended sandbox demonstration.
10. Desktop and phone layouts pass visual, keyboard, accessibility, console, and network-failure QA.
11. Published deployment, setup documentation, eligibility checklist, demo script, and real-versus-simulated disclosure are complete.

## 15. Explicit Non-goals

- Production payment activation
- Unattended real purchases
- General arbitrary-site browser automation
- Native mobile applications
- Unrelated private iMessage history
- Multi-user enterprise controls
- NANDA before the main product is stable

## 16. ADR Signals

The provider-neutral model interface, deterministic authorization owner, server-only credential boundary, and Sites-to-single-backend hosting rule are durable architecture decisions. Their final deployed forms require ADR backfill after capability verification and implementation evidence.

## 17. Planning Readback

Task intent: deliver a deployed, judge-ready Yukti product with a real Prava sandbox lifecycle and honest sponsor integration evidence.

Baseline read set: product brief, handbook, official sponsor documentation, initial baseline, and this spec.

Impact: new web application, database schema, provider contracts, OAuth and webhook boundaries, payment authorization enforcement, deployment, and submission evidence.

Requirement readiness: ready. The approved contract, scenario, acceptance criteria, cost authority, publishing authority, and non-goals are explicit.

