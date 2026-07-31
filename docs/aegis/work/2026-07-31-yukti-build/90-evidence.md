# Yukti Build Evidence

## Initial evidence

- Workspace contained no application code at baseline.
- `.env.local` was ignored and restricted to the current Windows account and SYSTEM.
- Composio project key authenticated without executing a tool.
- Linq token listed one healthy sandbox number without sending a message.
- Senso key authenticated to the Free organization without running search, ingestion, generation, or publishing.
- Prava test key created and revoked a sandbox session without card collection, credential issuance, or charge attempt.

Additional evidence is appended by bounded task slice, never as raw secrets or private provider payloads.

## Task 1: Sites capability boundary

- Bundled Sites plugin version inspected: `0.1.31`.
- Server runtime: Cloudflare Worker-compatible ESM with request dispatch.
- Persistence: logical D1 binding with prepared-statement guidance and managed migrations.
- Runtime secrets: supported through the Sites environment connector.
- Authentication: dispatch-owned SIWC and forwarded user headers.
- Scheduled events: no documented Sites cron contract; use a signed endpoint plus manual or repository-scheduled invocation.
- Decision: Sites-only application with D1; Cloud Run and Supabase are not created.
- Drift: aligned with the approved single-application and no-cost boundaries.

## Implementation and provider gate

- UI: desktop and 390 px phone views inspected; navigation, seeded candidate selection, approval modal, reset/cancel behavior, and provider readiness panel work without captured console errors.
- Persistence and approvals: user-scoped seeded records, server-owned candidate lookup, a 15-minute single-use approval, transaction audit records, and credential redaction are implemented against D1.
- Prava: an official `sk_test_` sandbox session was created through Yukti and revoked. No card was entered and no charge was attempted.
- Senso: Yukti organization retrieval returned the fictional Sarah fixture as the top semantic result. Yukti passes only retrieved chunks to Gemini.
- Gemini: `gemini-3.6-flash` structured generation succeeded with minimal thinking on the existing unbilled Google AI project. Pro models are rejected in code. No paid usage was incurred.
- Linq: the configured sandbox line reports `HEALTHY`. The product has an idempotent approved-message adapter, but no message was sent during this gate.
- Composio: the managed Google Calendar account remains `INITIATED`, not active. Consent was cancelled because it requested event editing plus calendar deletion and sharing; Yukti reports this provider as disconnected.
- Verification: typecheck, lint, 8 test files with 25 passing tests, rendered-output test, and production build pass.
- Secret boundary: the five local secret values were compared against tracked files and production output; zero exact matches were found. `.env.local` remains ignored.
