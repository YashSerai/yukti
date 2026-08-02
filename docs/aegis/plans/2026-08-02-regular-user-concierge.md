# Yukti regular-user concierge implementation plan

Date: 2026-08-02
Status: active

## Goal

Make the signed-in product one account-owned concierge for every user. Today must show real imported calendar occasions and user-created tasks, messaging must retain explicit relationship context and ask useful follow-up questions, proactive rules must have a safe unattended execution path, and Purchases must expose approvals and transaction state without storing card details.

## Architecture

- Keep GitHub OAuth, user-owned D1 rows, Linq phone pairing, exact single-use approvals, hosted Prava checkout, and the current provider safety boundaries.
- Extend D1 with task detail, clarification state, provider sync state, and scheduled-run idempotency rather than creating a parallel store.
- Treat calendar and email as optional user-scoped Composio connections. Imported records are normalized into the same event/task query used by manual records.
- Use deterministic parsing for safety controls and common facts, with Gemini Flash structured interpretation for wider intents and clarification. Only explicit user statements become memory.
- Expose a signed, idempotent scheduler endpoint. A repository GitHub Actions schedule may call it with a secret; it never grants purchase authority.
- Replace the overloaded owner/member Today split with extracted account-owned views. Keep the owner walkthrough as database content, not a UI branch.

## Technology

Vinext/React, Cloudflare Worker runtime, managed D1, Composio Google Calendar tools, Linq, Senso, Gemini Flash, Prava sandbox, Vitest, ESLint, ChatGPT Sites, GitHub Actions.

## Baseline and compatibility

- Baseline: production Sites version 20 and branch commit `68d8e86`.
- Preserve existing owner Sarah records, approval creation, Prava session creation/revocation/reconciliation, GitHub OAuth, Linq webhook verification, and existing API response fields.
- New migrations must be additive and idempotent. Existing accounts may have no new rows and must render useful empty states.
- Never persist provider access tokens, scoped Prava credentials, email bodies, or card data.

## Readiness checks

- Requirement readiness: ready. The user explicitly approved the product scope, local-only synthetic-user testing, production deployment, GitHub publication, and no-cost provider configuration.
- Change necessity: code change. The gaps are confirmed in source and production evidence.
- Existing mechanisms to reuse: identity/session, D1 ownership predicates, Composio connection lookup, Linq webhook, Senso retrieval, Gemini Flash client, approval handler, Prava adapters, provider status, and ChatGPT Sites deployment.
- New mechanisms justified: normalized task details, clarification state, provider sync cursors, scheduled-run receipts, calendar/email execution methods, purchases query, and signed scheduler endpoint.
- Complexity boundary: `site/app/yukti-demo.tsx` is the primary hotspot. New account surfaces should be extracted rather than adding another large conditional branch.

## TDD route

- Mode: off.
- Decision: skipped because the user requested implementation and QA, not strict TDD.
- Strict authority: not applicable.
- Test posture: post-change regression with focused unit/integration tests for schema behavior, ownership, provider parsing, clarification, scheduler authentication/idempotency, and rendered UI.

## Work batches

1. Add additive schema and domain contracts for tasks, task answers, connection sync, clarification, and scheduled runs.
2. Implement Composio Calendar import plus connection and sync APIs.
3. Implement generalized task CRUD/action APIs, unified Today snapshot, and Purchases ledger.
4. Implement contextual Linq clarification and explicit-memory persistence through Gemini Flash with deterministic fallback.
5. Implement signed proactive scheduler, dry-run behavior, quiet hours, and idempotent message preparation.
6. Extract and replace the signed-in UI for Today, task detail, Connections, People, Purchases, Activity, onboarding, and error/empty/loading states.
7. Prove isolation locally with two synthetic users through a localhost-only test identity seam that is excluded from production behavior.
8. Run source gates, secret scans, rendered desktop/phone QA, deploy the exact commit, and repeat production QA.
9. Update release evidence, GBrain durable truth, submission copy, and the humanized narration script.

## Verification

- TypeScript, ESLint, Vitest, production build, rendered HTML, migration application, exact secret-pattern scan.
- API tests for user ownership, task actions, calendar/email normalization, clarification continuation, and scheduler rejection/idempotency.
- Local browser QA at desktop and phone widths for signed out, two synthetic users, owner, onboarding, Today, task detail, People, Purchases, Activity, Connections, loading/empty/error states, keyboard focus, overflow, console, and network failures.
- Production Chrome QA for signed out and owner at desktop and phone sizes. No production auth bypass may exist or be configured.
- Verify every visible control with an actual interaction. Re-read and audit against the anti-slop design law before release.

## Cost and authority boundary

- No paid signup, card entry, billing configuration, purchase, or real message blast.
- Gemini Flash usage is authorized up to USD 50. Pro models remain rejected.
- Provider OAuth and no-cost deployment/configuration are authorized. Purchases still require explicit exact user approval.
