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

## Canonical migration and sponsor authorization

- The user approved a new Sites project to obtain the exact slug. Canonical project `appgprj_6a6d57a3299c8191a51d8b03ac7cc5fc` is public at `https://yukti.yashns.chatgpt.site`; the previous project remains online as rollback.
- Runtime environment revision 1 contains the same sandbox provider configuration. Secrets were copied through the Sites environment interface and were not printed or committed.
- GitHub OAuth application 3765534 now uses the canonical homepage and callback URL. Production login returned `@YashSerai`.
- The user explicitly approved Composio's disclosed Google Calendar consent, including broad event and calendar management scopes. Exact product user `yukti-owner` is active through connected account `ca_LkSAhtO9GyFG`.
- Hosted readiness now reports Prava `sandbox_ready`, Senso `configured`, Gemini `flash_ready`, Linq `healthy`, and Composio `connected`.

## Prava hosted test-card attempt

- Approval prefix `dafd26ad` created Prava sandbox session `ses_01KYXJJRRGBQFD0A37DDA3QHVN` for Granville Tea Co., Jasmine tea tasting set, CAD 42.00.
- The hosted Prava checkout accepted the displayed Visa sandbox card values and terms. No real card or billing identity was used.
- After submission, Prava remained on `Securing your card details…`. A direct authenticated payment-result check reported `pending`, zero transactions, and no scoped credentials.
- Because Prava had not issued credentials, Yukti did not claim a completed payment and did not report a fabricated merchant result.
- The new verification endpoint safely polls the owned transaction. If Prava returns `awaiting_result`, credentials remain inside the server callback, the deterministic seeded merchant returns a test-card decline, Yukti reports that known outcome to Prava, and only a non-sensitive reference and confirmation are persisted.

## Final local release candidate

- Gemini and Senso retry a single 502, 503, or 504 response. Timeouts and transaction mutations are never automatically retried.
- Typecheck, lint, 9 test files with 30 passing tests, and production build pass after the verification and retry changes.
- Submission copy, a two-minute demo script, eligibility checklist, and real-versus-simulated disclosure are present in the repository.

## Relationship concierge and live messaging

- Production version 11 is deployed at `https://yukti.yashns.chatgpt.site` with Sites environment revision 3.
- Google Messages sent one attended test message only to the configured Yukti Linq number. The signed webhook persisted Sarah as girlfriend, tulips, USD 75, and a 28-day flowers rule, then sent an automated reply to the owner's phone.
- An attended proactive scan retrieved FTD's current Sweet & Pretty Bouquet page and sent the owner a USD 45 suggestion. No purchase or charge occurred.
- Linq's v3 create-chat response is `chat.id`; Yukti now accepts that documented shape. Repeating the same suggestion used the original idempotent response and did not produce another message.
- Product scans now stop when the recipient has no explicit city or postal code. Production showed that prompt and returned no approval card.
- Google Messages supplied the explicit demo destination `Vancouver, BC`; the signed Linq webhook persisted it and Yukti replied with the correction/deletion boundary.
- Gemini 3.6 Flash's Interactions API first attempted `google_search`. The configured Search tool returned `429`, and direct Vertex Search-grounding checks returned provider `417` automated-query protection. Yukti then used Gemini URL Context against the exact FTD merchant URL rather than substituting stale model knowledge.
- Production version 13 displayed the cited FTD Sweet & Pretty Bouquet page, a starting price of USD 45, Vancouver delivery caveat, and the retrieval timestamp. The owner recorded an exact, 15-minute, single-use approval bound to Sarah, FTD, and USD 45. No payment session was started from this approval.
- The Prava dashboard was rechecked after the hosted test-card attempt. It shows the matching `ord_01KYXJJRRGBQFD0A...` CAD 42 order as `Pending`, seven total orders, zero total transactions, zero volume, and no success rate. This corroborates the earlier payment-result response: Prava has not issued scoped credentials or advanced to a transaction.
- ChatGPT Sites has no documented scheduled-event contract. Yukti's due-rule scan and attended `Prepare and text me` path are production-proven, but unattended cadence execution is not claimed without a signed external scheduler.
- Final gate: typecheck, lint with one external-image advisory and zero errors, 12 test files with 40 passing tests, rendered HTML test, production build, and zero exact secret-value hits.

## Copy audit and launch video

- Production version 19 is deployed at `https://yukti.yashns.chatgpt.site` from commit `1c390270b28315dbdd10bda653ab34617a612ac8`.
- Today, People, Wallet, Activity, both secondary event states, the purchase dialog, and 390 px phone layouts were inspected in the rendered production app. The internal-copy regression scan returned no matches, and the browser console returned no warnings or errors.
- Technical provenance IDs and the accidental `For the demo` message prefix were removed from presentation without changing the underlying memory or message records.
- The 73.37-second 1920x1080 H.264/AAC launch video was rebuilt from the verified production captures. Its source and MP4 live only under the locally excluded `local-video/` directory and are absent from Git history.
