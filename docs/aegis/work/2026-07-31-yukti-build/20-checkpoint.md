# Yukti Build Checkpoint

Updated: `2026-08-02`

## Current todo

Finish production visual QA, record the final demo against the current release, and complete the Devfolio submission. Keep Prava's provider-pending state explicit.

## Active slice

Release gate after the Calendar preparation and provider-integration slices.

## Completed todos

- Sponsor accounts created and credentials protected
- Credentials authenticated through non-billable checks
- Product renamed to Yukti
- Product and architecture design approved and written
- Implementation plan written and self-reviewed
- ChatGPT Sites capability boundary verified and recorded
- Sites-only hosting with D1 accepted in ADR 0001
- Yukti Sites application implemented with D1-backed approvals and audit records
- Seeded Sarah birthday judge path implemented and rendered at desktop and phone sizes
- Prava sandbox approval, checkout-session creation, and revocation proven without a charge
- Senso retrieval and Gemini 3.6 Flash preparation proven through the Yukti API
- Signed Linq inbound webhook verified from Google Messages to the owner-only Yukti line; Sarah relationship, tulip preference, budget, and cadence were persisted with provenance, and Yukti replied
- Proactive Linq suggestion verified with a current FTD product; Linq idempotency prevented duplicate delivery during the response-contract recheck
- Product scans now require an explicit recipient location and cited Gemini 3.6 Flash Google Search evidence; ungrounded snapshots cannot enter the live-product approval flow
- Composio Calendar is connected as `yukti-owner` after the user explicitly approved the disclosed Google Calendar scopes
- App-owned GitHub OAuth replaces the unreliable Sign in with ChatGPT dependency for sponsor actions; GitHub grants public-profile access only
- PKCE, single-use login state, hashed sessions, same-origin mutation checks, per-user and global quotas, provider timeouts, and response hardening protect shared keys
- Typecheck, lint, 49 tests, rendered-output test, and production build pass
- Exact-value secret scan reports zero hits in tracked source and built output
- Canonical Sites production release published at `https://yukti.yashns.chatgpt.site`; the previous project remains available as rollback
- Hosted Senso retrieval, Gemini brief, D1 approval, Prava sandbox creation, and Prava revocation verified end to end
- Hosted provider readiness reports Prava sandbox ready, Senso configured, Gemini Flash ready, Linq healthy, and Composio connected
- Production GitHub login, logout revocation, Senso-to-Gemini preparation, D1 approval, Prava sandbox creation, and Prava revocation are verified as `@YashSerai`
- GitHub OAuth homepage and callback now target the canonical Yukti URL
- The Prava hosted test-card submission was accepted but remained on `Securing your card details…`; the payment-result API still reported `pending` with no scoped credentials
- Yukti now has a safe verification endpoint that polls Prava, keeps credentials server-side, reports a deterministic sandbox merchant decline when credentials arrive, and exposes pending truthfully
- One bounded retry covers Gemini and Senso 502/503/504 responses without retrying timeouts or user actions
- Regular users receive the same Today, People, Purchases, Activity, and Calendar product surfaces as the owner account, with isolated account data
- Google Calendar imports upcoming events into Today through the connected user's Composio account
- General tasks support questions, saved answers, status changes, completion, and dismissal
- Contextual Linq messaging extracts only explicit relationship facts and asks follow-up questions when information is missing
- An hourly GitHub Actions worker checks due flower rules with quiet hours and idempotency; production dry-run `30742489798` passed
- Connected Google Calendars now refresh once a day through the same user-scoped path as the Calendar page's `Refresh now` action
- New or changed Calendar events receive a bounded Gemini preparation note and, when useful, one follow-up question; unchanged events are fingerprinted so they do not spend model credits again
- Purchases replaces the old Wallet label and provides a durable approval and transaction ledger
- Gmail was deliberately removed from the product, provider setup, and deployment configuration; Calendar is the only background source
- Sites version 29 is live from commit `3ee0967`; production owner QA verified the revised Calendar copy, a successful manual refresh, and an updated `Last checked` time with no application errors
- Production scheduler dry-run `30764879226` passed against version 29 and reported zero due Calendar accounts immediately after the manual refresh, plus zero due flower reminders
- The owner demo ledger is clean, generated reminder shells are removed, and Sarah's active flower rule next scans on August 28
- README, submission copy, demo script, eligibility checklist, and real-versus-simulated disclosure are current

## Evidence refs

- `docs/aegis/specs/2026-07-31-yukti-design.md`
- `docs/aegis/plans/2026-07-31-yukti-hackathon.md`
- `docs/aegis/baseline/2026-07-31-initial-baseline.md`
- `docs/evidence/sites-capability.md`
- `docs/adr/0001-hosting-boundary.md`

## Blockers

Prava's hosted sandbox is still provider-pending after the submitted test card. The matching dashboard order remains `Pending`, so scoped credential issuance and final status reporting do not yet have attended production evidence. No new or changed owner Calendar event was available during version 29 QA, so event-specific Gemini enrichment is automated-test and deployed-path verified but not yet captured in an attended production screenshot. The final demo recording, upload, and Devfolio submission remain open.

## Next step

Complete production visual QA, record the final demo against the approved narration, keep the Prava pending state explicit, and submit on Devfolio.

## Resume state

Resume from this checkpoint, inspect Git/worktree and the canonical Sites release, then continue from the unresolved Prava provider state. Do not expose the shared founders calendar to arbitrary GitHub users or send Linq messages without a user-scoped recipient and an attended verification need.

## Drift check

- Intent: aligned
- Scope: aligned
- Compatibility: aligned
- New owners: Sites Worker, D1, and app-owned GitHub OAuth match the approved hosting boundary
- Retirement: fixture and optional backend rules remain explicit
- Evidence: sufficient to begin Task 2
- Decision: continue
