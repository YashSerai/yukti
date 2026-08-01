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
- Verification: typecheck, lint, 9 test files with 29 passing tests, rendered-output test, and production build pass.
- Secret boundary: the five local secret values were compared against tracked files and production output; zero exact matches were found. `.env.local` remains ignored.

## Production release gate

- Production URL: `https://yukti-prava.yashns.chatgpt.site`.
- Access: public URL with Sign in with ChatGPT identity; this resolves the current owner-only mismatch caused by the founder Google account appearing under a temporary migration address.
- Runtime environment revision 1 contains sandbox mode plus Prava, Senso, Gemini, Linq, and Composio values. Sensitive values are stored as Sites secrets and were not printed or committed.
- Hosted status check: Prava `sandbox_ready`, Senso `configured`, Gemini `flash_ready` on `gemini-3.6-flash`, Linq `healthy` with provider reputation `HEALTHY`, Composio `disconnected` with calendar consent not granted.
- Hosted preparation: Senso retrieval and Gemini 3.6 Flash returned a source-labeled decision brief. The request completed without a paid model or Pro model.
- Hosted approval: the seeded purchase produced a server-recorded, user-scoped, single-use approval in D1.
- Hosted Prava: Yukti created a secure sandbox checkout session from that approval and then revoked it. The checkout was not opened, no card was entered, and no charge was attempted.
- Hosted logs at the original SIWC release gate contained no errors. The later GitHub-auth release is recorded separately below.

## GitHub authentication and abuse-control release

- GitHub OAuth application: Yukti requests no OAuth scope. GitHub's consent screen showed `Public data only`; no repository or email access was requested.
- Identity: the OAuth callback maps GitHub's numeric subject to a random internal user ID. The GitHub access token is used only to read the profile and is never persisted. Session secrets are stored only as hashes.
- Request controls: PKCE, single-use expiring state, secure host-only cookies, same-origin mutation checks, per-user and global quotas, provider timeouts, and `429 Retry-After` responses are active in sandbox mode.
- Build controls: local provider secrets are excluded from production Wrangler manifests. Exact secret-value, tracked-environment, and recognized key-prefix scans passed against tracked source and built output.
- Production version 3: commit `bfd89eed103a0aacc9e2b1544153d4ab33dfee0f` deployed successfully with Sites environment revision 2.
- Production proof: GitHub returned `@YashSerai`; readiness reported Prava `sandbox_ready`, Senso `configured`, Gemini `flash_ready`, Linq `healthy`, and Composio `disconnected`. Senso-to-Gemini preparation completed, D1 recorded a user-scoped approval, Prava created a scoped sandbox checkout session, and Yukti revoked it without opening checkout, entering a card, or attempting a charge. Logout returned the app to its anonymous gated state.
- Runtime note: the first protected Gemini preparation returned a transient `502`; a bounded retry completed successfully. Production browser console logs were empty.
- URL boundary: Sites supports changing the display title but not an existing URL slug. The live URL therefore remains `https://yukti-prava.yashns.chatgpt.site` unless an approved migration or custom domain is used.
