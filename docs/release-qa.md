# Yukti release QA

Updated: 2026-08-02

This is the current release authority. A row is complete only when the named source, local runtime, deployed runtime, and rendered view have the recorded evidence. Automated tests do not substitute for rendered or production checks.

## Product contract

- Signed-out visitors see a customer landing page with no account data.
- New GitHub users enter persisted onboarding and pair their own messaging number with the shared Yukti Linq line.
- Signed-in product data is user-owned. New accounts begin empty.
- Sarah and the judge flow exist only in the mapped owner account.
- Every purchase still requires a single-use, merchant-, item-, amount-, and time-scoped approval.

## Active issues

| ID | Surface | Required proof | Status |
| --- | --- | --- | --- |
| R1 | Signed-out landing | Desktop and phone render, no Sarah/demo/internal copy, working sign-in CTA | Local pass |
| R2 | Authentication return | GitHub sign-in returns to onboarding or the user's product | Open |
| R3 | Linq pairing | Persisted phone pairing, expiring one-time code, signed webhook verification, duplicate protection | Local pass; live sender pending |
| R4 | First-run onboarding | Welcome, messaging connection, first person, resumable state, error and expiry states | Local pass |
| R5 | New-user product | Empty Today, People, Wallet, and Activity states with no owner data | Local pass |
| R6 | Owner product | Sarah memory, current product, approval, Prava handoff, and activity remain owner-only | Local pass |
| R7 | Calendar connection | User-scoped Composio OAuth link and connection status | Source pass; production OAuth pending |
| R8 | Security | Same-origin mutations, ownership checks, no shared keys or owner phone exposed | Source and test pass |
| R9 | Release gate | Typecheck, lint, tests, production build, exact secret scan | Automated gate pass |
| R10 | Production QA | Signed out, new user, returning user, owner at desktop and phone sizes | Open |
| R11 | Demo capture | Fresh unfiltered screen recording from the owner account | Blocked by R1-R10 |
| R12 | Demo edit | Narration-aligned scenes, semantic motion review at every transition, no provider-failure ending | Blocked by R11 |

## Evidence log

Add bounded evidence here only after a check runs. Record the route, identity state, viewport, result, artifact path, and what would invalidate it.

- 2026-08-02, local `/`, signed out: rendered at 1440 x 1000 and 390 x 844. No horizontal overflow, Sarah, fixture, demo, sponsor, or internal workflow copy. Invalidated by landing component, global CSS, responsive CSS, or auth bootstrap changes.
- 2026-08-02, local `/`, fresh fixture identity: completed persisted phone pairing with an expiring code, first-person creation for Alex/Friend, optional-calendar completion, and arrival in an empty account. Today, People, Wallet, and Activity showed only user-owned data. Invalidated by onboarding, identity, schema, migration, webhook, or signed-in UI changes.
- 2026-08-02, source gate: TypeScript, 43 Vitest tests across 13 files, ESLint, production build, and rendered-HTML test passed. Invalidated by any source, dependency, configuration, or migration change.
- 2026-08-02, local `/`, owner-mapped fixture identity: the preloaded Sarah workspace appeared only after the configured owner login matched. The same identity previously completed clean onboarding and displayed Alex only when it was not owner-mapped. Invalidated by owner mapping, identity, owner seeding, or product UI changes.
