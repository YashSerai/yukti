# Yukti Hackathon Implementation Plan

**Goal:** Build, verify, publish, and document Yukti as a judge-ready event-to-action commerce agent with a real Prava sandbox lifecycle, meaningful Linq, Senso, and Composio integrations, Gemini Flash reasoning, and a deterministic seeded birthday demonstration.

**Architecture:** One TypeScript web application owns the user experience and deterministic domain logic. Provider-specific calls sit behind typed server adapters. A relational database owns state, provenance, idempotency, jobs, and audit records. ChatGPT Sites is the required publishing surface; one Cloud Run service is permitted only if Sites cannot host the required secure backend capabilities.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, accessible headless primitives, Zod, Drizzle ORM, PostgreSQL/Supabase when external persistence is required, Vitest, Testing Library, Playwright, Vertex AI Gemini Flash, Composio v3, Linq v3, Senso, and Prava sandbox SDK/REST.

**Baseline/Authority Refs:** `docs/aegis/specs/2026-07-31-yukti-design.md`, `docs/aegis/baseline/2026-07-31-initial-baseline.md`, the user brief at `C:\Users\yashs\.codex\attachments\5352f6f6-b08c-4425-9924-cc3a58575a56\pasted-text.txt`, the public hackathon handbook, and current official sponsor documentation.

**Compatibility Boundary:** Windows development, server-only secrets, no use of the existing Soulspace Google Cloud project, honest real-versus-seeded labels, no raw email retention, no payment credential persistence, no GitHub push before the approved window, and no paid action except up to USD 20 of Gemini Flash inference.

**TDD Route:**

- Mode: auto
- Decision: light
- Strict authority: not applicable
- Test posture: post-change regression with focused invariant tests before provider mutations
- Reason: the user requires automated coverage, but did not request strict red-green-refactor sequencing; the payment and state-machine invariants receive focused tests before attended sandbox execution.
- Verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, and `npm run test:e2e`

## Aegis Visibility

Planning is necessary because payment authorization, personal context, provider boundaries, public callbacks, and demo evidence must have one canonical owner each; improvising those seams during a short hackathon would create untestable and potentially unsafe behavior.

## Plan Basis

Facts:

- The workspace has no inherited application code.
- Prava sandbox credentials can create and revoke a session.
- Linq exposes one healthy sandbox number.
- Composio accepts the project key.
- Senso accepts the key on its Free tier.
- The current Google Cloud project belongs to Soulspace and is excluded.
- The user authorized no-cost publishing and up to USD 20 of Gemini Flash usage.

Assumptions to verify in Task 1:

- ChatGPT Sites may require a separate backend for secrets, OAuth callbacks, webhooks, persistence, or background work.
- Supabase's free tier is available for the project if Sites does not supply suitable persistence.
- A current Gemini Flash model supports the required structured output in the user's eligible region.

Known unknowns do not block local work because provider contracts and persistence are isolated behind adapters.

## Baseline Usage Draft

- Required baseline refs: approved design, initial baseline, user brief, handbook, official provider docs
- Delivered context refs: user decisions and verified account state in the active task
- Acknowledged before plan refs: all required refs
- Cited in plan refs: approved design, initial baseline, provider contracts
- Missing refs: live ChatGPT Sites capability result and final deployed callback URLs
- Decision: continue; Task 1 resolves the remaining deployment evidence before provider callback configuration

## Requirement Ready Check

- Requirement source refs: approved design and user brief
- Goals and scope refs: design sections 1 through 3
- User / scenario refs: Sarah birthday demonstration and connected user workflow
- Requirement item refs: design sections 4 through 13
- Acceptance / verification criteria refs: design section 14
- Open blocker questions: none for local implementation
- Decision: ready

## Change Necessity

- User-visible need: no application exists; users cannot connect a calendar, receive preparation help, approve a transaction, or inspect evidence.
- No-change / non-code option: sponsor dashboards alone cannot implement or demonstrate the product workflow.
- Why code change is necessary: domain state, authorization enforcement, provider orchestration, UI, persistence, and tests must be created.
- Minimum change boundary: one web application, one relational schema, isolated provider adapters, and deployment configuration.
- Decision: code-change

## Existence Check

- Proposed new surfaces: model adapter, sponsor adapters, domain state machine, persistence repository, background job runner, and optional single backend host.
- Existing owner / reuse candidate: no project code exists; the web app can own domain orchestration while adapters own external contracts.
- Why existing surface is insufficient: sponsor dashboards expose credentials but no Yukti behavior.
- Creation proof: each surface has a separate external contract or safety invariant and can be tested independently.
- Entropy / retirement impact: fixture adapters retire from connected demonstrations but remain for deterministic automated tests; no duplicate production owner is permitted.
- Decision: add-with-proof

## Architecture Integrity Lens

- Invariant: deterministic code owns authorization, state transitions, idempotency, and money.
- Canonical owner / contract: domain services own decisions; provider adapters own transport; repositories own persistence; routes only translate HTTP.
- Responsibility overlap: model output cannot execute provider actions and UI routes cannot construct payment credentials.
- Higher-level simplification: one `ProviderRegistry` selects real or fixture adapters by validated runtime mode.
- Retirement / falsifier: if ChatGPT Sites supports all backend needs, the Cloud Run fallback is rejected; if it does not, one backend service is added and documented.
- Verdict: coherent and ready for task decomposition.

## Complexity Budget

- Artifact class: Source Complexity, Test Complexity, Decision / Plan Complexity
- Target files / artifacts: domain services, provider adapters, route handlers, component modules, focused tests, this plan
- Current pressure: zero source code; high cross-provider scope
- Projected post-change pressure: risk of an oversized orchestrator and dashboard component
- Budget result: at-risk
- Planned governance: one owner per provider, small domain services, route handlers below orchestration, feature-level components, test helpers separated from test cases, and an 800-line soft review trigger

## Plan-Time Complexity Check

- Target files: new source files only
- Existing size / shape signals: none
- Owner fit: clear if the directory map below is preserved
- Add-in-place risk: a single agent service or event page could accumulate provider and UI responsibilities
- Better file boundary: separate `domain`, `services`, `providers`, `db`, `app/api`, and `components/features`
- Recommendation: add owner files and split tasks

## File Map

```text
src/
  app/
    (marketing)/page.tsx
    (product)/app/page.tsx
    (product)/events/[eventId]/page.tsx
    (product)/people/page.tsx
    (product)/wallet/page.tsx
    (product)/connections/page.tsx
    (product)/audit/page.tsx
    api/auth/[...]/route.ts
    api/calendar/scan/route.ts
    api/conversations/reply/route.ts
    api/approvals/[approvalId]/route.ts
    api/prava/session/route.ts
    api/prava/callback/route.ts
    api/webhooks/linq/route.ts
    api/jobs/run/route.ts
  components/
    primitives/
    shell/
    event/
    approval/
    evidence/
    judge/
  domain/
    event.ts
    plan.ts
    approval.ts
    transaction.ts
    memory.ts
    audit.ts
    state-machine.ts
  services/
    event-scanner.ts
    context-builder.ts
    preparation-planner.ts
    recommendation-service.ts
    conversation-service.ts
    approval-service.ts
    checkout-service.ts
    calendar-update-service.ts
    job-runner.ts
  providers/
    registry.ts
    contracts.ts
    gemini/
    composio/
    linq/
    senso/
    prava/
    fixture/
  db/
    client.ts
    schema.ts
    repositories/
    seed.ts
  env/
    server.ts
    public.ts
  lib/
    errors.ts
    ids.ts
    money.ts
    redaction.ts
    rate-limit.ts
tests/
  unit/
  integration/
  e2e/
docs/
  architecture.md
  deployment.md
  demo-script.md
  eligibility-checklist.md
  real-vs-simulated.md
  evidence/
```

## Execution Readiness View

- Intent Lock: deliver the complete Yukti birthday demonstration through generalized contracts
- Scope Fence: no production payments, arbitrary browser shopping, native apps, NANDA, or enterprise administration
- Baseline Lock: approved design and initial baseline
- Approved Behavior: explicit approval, real Prava sandbox lifecycle, attributable context, visible Senso evidence, Linq conversation, Google calendar update
- Owner / Contract Constraints: domain services own decisions; adapters own providers; repositories own persistence; routes are transport-only
- Compatibility Boundary: Windows, Sites publishing, single optional backend, no secret or payment credential exposure
- Retirement Boundary: fixture adapters remain only for tests and seeded mode; they cannot masquerade as provider results
- Task Batches: capability and scaffold; domain and data; UI; providers; payment; QA and release
- Test Obligations: type, lint, unit, contract, webhook, browser, accessibility, mobile, and attended sandbox evidence
- Review Gates: provider mutation gate, payment attended gate, publish verification, final real-versus-simulated audit
- Drift / Rewind Rules: stop and update the design if a provider contract invalidates an ownership or safety invariant; otherwise adapt only inside the owning adapter
- Evidence Required Before Completion: command output, provider response metadata without secrets, screenshots, public URL checks, demo receipt/status, and eligibility checklist
- Advisory Boundary: execution guidance only; passing tasks do not independently establish final product completion

## Task 1: Verify ChatGPT Sites and hosting capabilities

**Files:** Create `docs/evidence/sites-capability.md`; create `docs/adr/0001-hosting-boundary.md` after verification.

**Why:** OAuth callbacks, webhooks, secrets, persistence, and scheduled work require an evidence-backed host boundary.

**Change Necessity:** Documentation and deployment configuration are required because the current workspace has no host contract. No product source is changed until the result is known.

**Impact/Compatibility:** The result selects either a Sites-only deployment or Sites plus one Cloud Run backend. Both preserve one canonical UI and one canonical backend owner.

**Steps:**

1. Read the complete Sites building and hosting skill instructions.
2. Inspect the current Sites project/runtime for server execution, environment variables, persistence, OAuth callbacks, inbound webhooks, background work, external requests, and custom domains.
3. Record each capability as supported, unsupported, or unverified with direct evidence and invalidation conditions.
4. Write ADR 0001 selecting Sites-only when all required capabilities are supported; otherwise select Sites plus one Cloud Run backend.
5. Verify the evidence file contains no unfinished markers, secrets, or unsupported claims.

**Verification:** Review both files completely and run the repository secret scan; neither file may contain an unfinished marker, secret value, or unsupported claim.

## Task 2: Scaffold the canonical application

**Files:** Create `package.json`, lockfile, TypeScript/Next/Tailwind/ESLint/Vitest/Playwright configuration, `src/app/layout.tsx`, `src/app/globals.css`, `src/env/server.ts`, `src/env/public.ts`, and `.env.example`; modify `.gitignore` without removing `.env.local`.

**Why:** Establish a reproducible, typed, testable application with validated configuration.

**Change Necessity:** No runnable application exists. The minimum boundary is the framework scaffold and environment contract.

**Impact/Compatibility:** Node 24 on Windows must install, type-check, and start locally. `.env.example` contains variable names only.

**Steps:**

1. Initialize a current stable Next.js TypeScript App Router project in the existing directory without overwriting `.env.local`, `.gitignore`, or `docs`.
2. Install Zod, Drizzle, PostgreSQL client, Vitest, Testing Library, Playwright, accessibility tooling, and the provider SDKs only after confirming their current official package names.
3. Add scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:integration`, `test:e2e`, `db:generate`, `db:migrate`, and `db:seed`.
4. Implement server and public environment schemas. Server variables include only the provider keys and deployment/database values actually used; public variables contain no secrets.
5. Add a secret-redaction test that scans built public assets and logs for known key prefixes.
6. Start the app and confirm the base route returns 200 without requiring provider keys in seeded mode.
7. Create a local Git repository and commit the scaffold locally; do not add a remote or push.

**Verification:** `npm ci && npm run typecheck && npm run lint && npm test && npm run build` all exit 0; `git status --ignored --short` shows `.env.local` ignored.

## Task 3: Implement data schema, repositories, and deterministic seeds

**Files:** Create `src/db/schema.ts`, `src/db/client.ts`, `src/db/repositories/*`, `src/db/seed.ts`, `drizzle.config.ts`, migrations under `drizzle/`, and unit tests under `tests/unit/db/`.

**Why:** The event-action engine needs durable, queryable state, provenance, idempotency, and audit history.

**Change Necessity:** In-memory state cannot support webhooks, callbacks, recovery, or judge evidence. The minimum source boundary is one schema and focused repositories.

**Impact/Compatibility:** PostgreSQL is canonical. Tests use an isolated database or transaction-scoped test schema. Provider payloads are not stored wholesale.

**Steps:**

1. Define normalized tables for the entities in design section 6 with UUID identifiers, timestamps, ownership keys, and constrained enums.
2. Add unique keys for provider event IDs, webhook deliveries, approval consumption, and transaction references.
3. Add provenance fields to memory and evidence tables; omit raw email bodies and payment credentials.
4. Implement repositories with domain-shaped inputs and outputs rather than leaking ORM rows.
5. Seed Sarah, her birthday event, attributable photography interest, USD 75 gift budget, three candidates, and clearly labelled fixture evidence.
6. Add migration and seed tests that prove reset determinism and uniqueness constraints.

**Verification:** `npm run db:generate && npm run db:migrate && npm run db:seed && npm test -- tests/unit/db` exit 0; schema inspection finds no PAN, CVV, card number, or raw email column.

## Task 4: Implement domain contracts and state-machine invariants

**Files:** Create `src/domain/*`, `src/services/approval-service.ts`, `src/services/checkout-service.ts`, `src/lib/money.ts`, and tests under `tests/unit/domain/`.

**Why:** Authorization and transaction safety cannot depend on prompts or UI behavior.

**Change Necessity:** No canonical state or approval owner exists. The minimum boundary is pure domain types plus deterministic services.

**Impact/Compatibility:** Provider adapters consume domain requests and return domain results; they cannot mutate state independently.

**Steps:**

1. Define Zod schemas for event facts, preparation plans, proposed actions, candidates, evidence, approvals, and transaction results.
2. Implement the state transition table including `outcome_unknown` and explicit legal transitions.
3. Implement currency-safe integer minor-unit arithmetic.
4. Implement approval creation and consumption checks for user, event, candidate, merchant, amount, currency, expiry, and prior use.
5. Implement checkout orchestration that revalidates approval immediately before invoking Prava or a merchant adapter.
6. Add tests for over-budget, altered merchant, altered amount, expiry, replay, duplicate webhook, illegal transition, and uncertain outcome.

**Verification:** `npm test -- tests/unit/domain` exits 0 with every approval bypass case rejected.

## Task 5: Implement provider contracts, registry, and fixture mode

**Files:** Create `src/providers/contracts.ts`, `src/providers/registry.ts`, `src/providers/fixture/*`, `src/lib/redaction.ts`, and contract tests under `tests/integration/providers/fixture/`.

**Why:** Seeded and connected flows must exercise the same orchestration without false claims or provider coupling.

**Change Necessity:** Direct provider calls inside routes would duplicate behavior and prevent deterministic tests. The minimum boundary is one contract per provider role and one registry.

**Impact/Compatibility:** Runtime mode selection is validated server-side and displayed in the UI. Fixture results carry `sourceKind: fixture`.

**Steps:**

1. Define interfaces for ModelProvider, ContextProvider, MessagingProvider, EvidenceProvider, PaymentProvider, and MerchantCheckoutProvider.
2. Define typed provider errors with retryability, public message, trace ID, and redacted diagnostic fields.
3. Implement fixture adapters using the Sarah seed while preserving the same request/response schemas as real adapters.
4. Implement registry selection for development, seeded, sandbox, and connected modes.
5. Add redaction for key prefixes, tokens, authorization headers, PAN-like strings, and dynamic CVV fields.
6. Add contract tests proving fixture labels and redaction.

**Verification:** `npm run test:integration -- tests/integration/providers/fixture` exits 0 and a repository-wide key-prefix scan finds no secret value.

## Task 6: Implement the event-to-action orchestration

**Files:** Create the service files in `src/services/`, route `src/app/api/calendar/scan/route.ts`, and tests under `tests/unit/services/`.

**Why:** Yukti's differentiator is turning arbitrary events into preparation plans rather than switching among hard-coded event types.

**Change Necessity:** The domain types alone do not perform context selection, planning, follow-up, ranking, or deadline checks.

**Impact/Compatibility:** Services depend on provider contracts and repositories, never provider implementations.

**Steps:**

1. Implement event scanning with horizon, deduplication, and user pause/quiet-hour rules.
2. Implement context retrieval with source allowlists, relevance limits, and provenance attachment.
3. Implement structured preparation planning without event-type branches.
4. Implement missing-information detection and minimal follow-up questions.
5. Implement candidate ranking using fit, budget, delivery cutoff, evidence freshness, and merchant trust.
6. Persist every major step as a typed audit event.
7. Add tests for birthday, trip, guests, irrelevant event, insufficient context, missed delivery cutoff, and duplicate scan.

**Verification:** `npm test -- tests/unit/services` exits 0 and coverage includes at least one non-birthday commerce action through the same orchestration.

## Task 7: Add Gemini Flash with a hard cost boundary

**Files:** Create `src/providers/gemini/client.ts`, `schemas.ts`, `prompts.ts`, `usage-ledger.ts`, tests, and `docs/evidence/gemini-model-selection.md`.

**Why:** Runtime reasoning needs structured, attributable output while staying inside the user's USD 20 authorization.

**Change Necessity:** Fixture reasoning cannot establish the real model path. The minimum boundary is a Gemini adapter plus local cost ledger and kill switch.

**Impact/Compatibility:** No use of Gemini 3.1 Pro. The adapter exposes only domain schemas and can be replaced by another model provider.

**Steps:**

1. Create or select a dedicated Yukti Google Cloud project without touching `soulmate-prod-488601`; verify billing-credit applicability before inference.
2. Enumerate currently available Gemini Flash models from official Vertex APIs and exclude all Pro models and `3.1-pro` explicitly.
3. Smoke-test the newest eligible Flash model and one stable fallback for structured output without including private user data.
4. Record model ID, region, test time, response validity, token counts, and estimated cost.
5. Implement schema-validated prompts for classification, context selection, preparation plans, questions, comparisons, and message interpretation.
6. Implement a USD 20 hard application stop using recorded usage and conservative pricing; stop before USD 18 to preserve estimation headroom.
7. Add tests for malformed output, refusal, timeout, quota, cost stop, and prohibited model selection.

**Verification:** `npm test -- tests/unit/providers/gemini` exits 0; model-selection evidence names a Flash model and records `3.1-pro` as forbidden; the usage ledger cannot authorize inference at or above USD 18 estimated spend.

## Task 8: Build the Yukti interface and seeded judge flow

**Files:** Create the product routes and components in the File Map, plus UI tests and seeded Playwright flow.

**Why:** Judges and users need a clear consumer experience that makes context, timing, approval, evidence, and transaction state legible.

**Change Necessity:** The backend contracts have no usable interface. The minimum boundary is the listed routes with reusable feature components.

**Impact/Compatibility:** Content is visible without animation, keyboard usable, reduced-motion safe, responsive at 390px and desktop widths, and free of generic dashboard filler.

**Steps:**

1. Read the canonical anti-slop design law and generate an ImageGen visual direction before styling.
2. Define Yukti's typography, color, spacing, status, and motion tokens from the approved visual direction.
3. Build the landing page, onboarding, preparation timeline, event workspace, people/memory, wallet, connections, audit, and judge-mode surfaces.
4. Make the calendar timeline the primary information structure and the transaction envelope the signature interaction.
5. Implement complete loading, empty, partial, error, success, offline, expired-approval, and disconnected-provider states.
6. Apply the Humanizer workflow to every product-facing string.
7. Add keyboard, focus, accessible name, contrast, and reduced-motion tests.
8. Add a deterministic Playwright Sarah flow through recommendation and pending approval without bypassing payment safety.

**Verification:** `npm test -- tests/unit/components && npm run test:e2e -- tests/e2e/seeded-birthday.spec.ts` exit 0; screenshot evidence covers 1440x900, 1024x768, and 390x844 including lower-page content.

## Task 9: Add Composio Google connections

**Files:** Create `src/providers/composio/*`, connection routes, callback handling, and integration tests.

**Why:** Real Calendar, Gmail, and People context is required for the connected demonstration.

**Change Necessity:** The project key alone does not connect a user or expose Google data. The minimum boundary is managed authentication plus an explicit tool allowlist.

**Impact/Compatibility:** Least privilege, server-only key, no unrestricted model access, no raw email persistence.

**Steps:**

1. Use current Composio v3 `composio.create(user_id)` session patterns and managed authentication where supported.
2. Connect Calendar, Gmail, and People for the demo user through attended Google consent.
3. Allow only event list/read/update, Gmail search/thread read, and People lookup operations required by the spec.
4. Map results into domain context with provider references and redact raw content before persistence.
5. Add connection-health and reconnect behavior.
6. Test against the real connected account with bounded read queries before any calendar update.

**Verification:** integration tests prove list/read on a designated test event, bounded Gmail lookup, People lookup, and an update to a designated test calendar event; audit records contain references but no raw email body.

## Task 10: Add Linq conversation and webhook handling

**Files:** Create `src/providers/linq/*`, webhook route, conversation routes, signature/idempotency tests, and evidence.

**Why:** Messaging is Yukti's primary daily interface and a sponsor-track requirement.

**Change Necessity:** The authenticated token and number do not create conversations or receive webhooks. The minimum boundary is one adapter and one webhook endpoint.

**Impact/Compatibility:** Only approved sandbox recipients receive development messages. Incoming messages are limited to the agent's Linq identity.

**Steps:**

1. Implement number discovery and cache the provisioned number by provider ID.
2. Implement proactive text messages, replies, approval prompts, confirmations, and failure messages.
3. Implement webhook verification according to current Linq documentation, raw-body handling where required, and delivery ID deduplication.
4. Translate inbound replies into domain conversation commands.
5. Enforce quiet hours, opt-out, rate limits, and approved-recipient restrictions.
6. Run one attended outbound and inbound sandbox conversation with the user's approved number.

**Verification:** webhook replay tests process one domain message exactly once; the attended evidence contains provider message IDs and timestamps without message secrets.

## Task 11: Add Senso evidence and candidate rejection

**Files:** Create `src/providers/senso/*`, evidence components, ingestion/configuration scripts if required, and integration tests.

**Why:** Senso must materially ground merchant and product decisions rather than decorate the UI.

**Change Necessity:** The free-tier key authenticates but no Yukti evidence path exists. The minimum boundary is ingestion/search mapping and decision integration.

**Impact/Compatibility:** Evidence includes source, retrieval time, and claim mapping. Missing or stale evidence can lower rank or reject a candidate.

**Steps:**

1. Inspect the current Senso API and configure the smallest merchant/product corpus needed for the birthday demo without invoking automated publishing.
2. Ingest approved public merchant sources for product detail, availability, delivery, returns, and trust.
3. Implement bounded evidence search and map every result to a candidate claim.
4. Reject candidates that miss the event deadline, exceed budget, conflict with merchant restrictions, or lack required evidence.
5. Display the evidence and explain its effect on ranking.
6. Add a test in which Senso evidence changes the selected candidate.

**Verification:** real integration evidence shows a Senso query and attributable result; the selection test fails if Senso results are ignored.

## Task 12: Add the full Prava sandbox lifecycle

**Files:** Create `src/providers/prava/*`, Prava session and callback routes, approval components, transaction evidence, and payment integration tests.

**Why:** Meaningful Prava usage and an agent completing or enabling a transaction are the central judging requirement.

**Change Necessity:** Credential authentication alone is insufficient. The app must create a just-in-time session, collect approval, receive scoped credentials, attempt checkout, and report the outcome.

**Impact/Compatibility:** Raw card and scoped credentials remain inside Prava/server memory, are never rendered or persisted, and are discarded immediately after merchant execution.

**Steps:**

1. Install and verify the official Prava SDK package and current sandbox REST schemas.
2. Create sessions from a consumed, exact Yukti approval with merchant, item, amount, currency, user, and callback context pinned.
3. Embed Prava's secure collection iframe and handle new-device OTP/passkey behavior without touching card data.
4. Poll payment result until pending, awaiting result, terminal failure, or timeout.
5. Extract scoped credentials only inside the server-side checkout call and immediately discard them.
6. Implement one merchant checkout adapter suitable for the attended demonstration.
7. Report `APPROVED` or `DECLINED` to Prava for every known merchant outcome; store `outcome_unknown` without retry when uncertain.
8. Reconcile Prava status, store non-sensitive references, create receipt/audit entries, notify through Linq, and update the calendar.
9. Add idempotency and replay tests at session creation, callback, payment result, merchant execution, and status reporting boundaries.
10. Run the attended test-card flow. A small real purchase requires separate approval despite the general USD 20 Gemini authorization.

**Verification:** automated tests prove no approval bypass and no credential persistence; attended evidence shows session creation, secure collection, scoped credential issuance, merchant attempt, report-status call, final Prava status, Linq confirmation, and calendar update.

## Task 13: Publish, certify, and prepare submission

**Files:** Complete root `README.md`, architecture, deployment, demo, eligibility, real-versus-simulated, ADR, checkpoint, and bounded evidence documents.

**Why:** A working build without public verification and accurate submission evidence is not hackathon-ready.

**Change Necessity:** Documentation, deployment, and evidence are required deliverables. The minimum boundary is one public application, one current checkpoint, and bounded evidence files.

**Impact/Compatibility:** Publishing is authorized when free. GitHub push remains deferred until the agreed time. No secret enters deployment logs, source, screenshots, or submission text.

**Steps:**

1. Run the complete local verification suite and fix every failure within scope.
2. Publish through ChatGPT Sites using the selected hosting ADR and configure free callback endpoints.
3. Verify the public app at desktop and phone sizes, including lower-page content, auth boundaries, console, network failures, focus, keyboard, loading, empty, error, and overflow states.
4. Run the connected Google, Linq, Senso, Gemini, and Prava sandbox demonstration.
5. Record exact source/deploy boundary, checks, exclusions, provider IDs, timestamps, and invalidation conditions.
6. Complete the handbook eligibility checklist and track-specific evidence.
7. Write the demo script and submission copy using the Humanizer workflow.
8. Scan source, Git index, built assets, logs, screenshots, and documents for secrets and unsupported claims.
9. At the agreed time, create or connect the GitHub repository and push the verified local history.

**Verification:** `npm run typecheck && npm run lint && npm test && npm run test:integration && npm run test:e2e && npm run build` exit 0; public smoke tests return 200; the secret scan is clean; all eligibility items have evidence or an explicit exclusion.

## Plan Pressure Test

- Owner / contract / retirement: each domain and provider role has one owner; fixtures cannot own connected outcomes
- Architecture integrity / higher-level path: provider registry and domain services prevent route-level orchestration
- Verification scope: focused unit, contract, sandbox, browser, security, and public deployment evidence
- Task executability: tasks name exact owners, mutations, boundaries, and commands
- Pressure result: proceed

## Risks and Responses

- Sites lacks backend capabilities: use one Cloud Run backend, preserving Sites as the user-facing application.
- Gemini model naming or regional availability changes: enumerate live models and choose an eligible Flash model through the adapter.
- Google OAuth approval delays: keep seeded mode complete and document the exact attended consent step.
- Linq sandbox expiration: prioritize the real messaging path and record expiry evidence.
- Senso corpus is empty: ingest only approved public merchant sources; do not invoke automatic publishing.
- Merchant declines Prava test credentials: report `DECLINED`, prove scoped credentials and status closure, and retain the decline path as valid judge evidence.
- Uncertain merchant result: enter `outcome_unknown`, reconcile, and never blind-retry.
- Time pressure: protect the end-to-end Sarah spine before secondary surfaces or optional NANDA work.

## Retirement

- Development fixtures remain permanent test infrastructure but cannot appear as real provider evidence.
- The Cloud Run fallback is not created if Sites proves sufficient.
- Temporary sandbox sessions created by diagnostics are revoked or allowed to expire without card collection.
- No pre-hackathon remote repository is created or pushed.
- Temporary screenshots and logs containing private context are excluded from source control and submission artifacts.

## Self-Review Result

The plan covers every approved requirement, contains no implementation placeholders, preserves provider and authorization boundaries, names exact verification commands, separates fixture and real modes, records hosting and model unknowns as evidence tasks, and carries the payment, cost, privacy, publishing, and Git boundaries into execution.
