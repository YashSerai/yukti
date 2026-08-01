# Yukti Relationship Concierge Implementation Plan

Goal: turn the seeded Yukti demo into a working, owner-scoped Linq concierge with editable memory, proactive flower preparation, attributable real products, and the existing Prava approval handoff.

Authority: `docs/aegis/specs/2026-07-31-yukti-relationship-concierge-design.md` and the existing Yukti architecture design.

## 1. Persistence and contracts

Modify `site/db/schema.ts`, add migration `site/drizzle/0002_relationship_concierge.sql`, and add focused domain modules under `site/domain/`.

- Add owner phone mapping, conversations, messages, webhook receipts, enriched memory facts, proactive rules, product snapshots, and purchase history.
- Preserve existing IDs and seeded tables so the deployed demo migrates without data loss.
- Add pure parsers and eligibility checks for relationship facts, budgets, opt-out, quiet hours, and cadence.
- Verify migration shape, ownership, deduplication, and eligibility with Vitest.

## 2. Linq inbound and outbound path

Modify `site/providers/linq/client.ts`, `site/server/approval-handler.ts`, and environment declarations.

- Add subscription management and Standard Webhooks signature verification over the raw request body.
- Add an unauthenticated but signed webhook route before same-origin and GitHub checks.
- Restrict accepted direct chats and sends to the configured owner recipient.
- Persist, deduplicate, parse, learn, and reply to owner messages.
- Keep a dry-run route for local fixture testing and one attended production message after deployment.

## 3. Memory API and console

Add authenticated owner routes to list people, messages, facts, and rules; edit, confirm, or delete facts; create or disable a proactive rule; and run a manual scan.

Modify `site/app/yukti-demo.tsx` and `site/app/globals.css` so People is a real relationship ledger. Show source, confidence, explicit or proposed state, correction controls, cadence, and recent conversation. Keep connected data owner-only and seeded data judge-safe.

## 4. Real product and evidence path

Add `site/providers/products/flowers.ts` with an allowlisted merchant and canonical product parsing. Store price, currency, URL, image, availability claim, and retrieval time. Treat failed live retrieval as stale or unavailable rather than inventing candidates.

Run the current Senso adapter against the selected product evidence and persist how it affected the recommendation. Add fixtures only for deterministic contract tests and label them as fixtures.

## 5. Proactive scan and approval bridge

Add an idempotent proactive service used by the signed job route and authenticated manual scan.

- Enforce enabled state, quiet hours, next eligibility, budget, and open-recommendation deduplication.
- Create one attributable recommendation.
- Send one concise Linq prompt to the owner when live send is requested.
- Convert an approved product snapshot into the existing exact approval and Prava session flow.
- Keep recurring behavior at preparation and reminder only.

## 6. Verification and release

- Run typecheck, lint, all unit tests, rendered build, and a secret scan.
- Exercise signed webhook replay, unknown sender, memory correction, rule eligibility, real product retrieval, Senso influence, owner isolation, and approval handoff.
- Deploy the D1 migration and Sites release.
- Create the Linq webhook subscription only after the public endpoint is live, save its one-time signing secret in the existing ignored secret store and Sites secret configuration, and never print it.
- Send one attended, no-URL first message to the user's verified phone and verify one inbound reply.
- Re-run desktop and phone visual QA and update checkpoint, evidence, disclosure, demo script, and GBrain.

## Completion boundary

Complete means the connected owner can text Yukti, see learned memory in the console, run or receive a proactive real-product recommendation, and enter the existing Prava approval path. A provider-pending Prava test card remains labeled provider-pending unless its status changes; it does not invalidate the completed concierge path.

## Self-review

The plan builds one vertical end to end, does not duplicate payment ownership, does not expose private integrations to judges, and separates deterministic tests from attended provider evidence. No step requires a paid plan, real purchase, or automatic recurring charge.
