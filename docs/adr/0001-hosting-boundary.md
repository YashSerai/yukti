# ADR 0001: Host Yukti on ChatGPT Sites with D1

Date: `2026-07-31`
Status: `accepted for implementation`

## Context

Yukti needs a public responsive application, protected user data, durable relational state, server-only provider keys, Google OAuth, Linq webhooks, Prava callbacks, and background event scanning. The product brief prefers ChatGPT Sites and allows the smallest external service only when the platform cannot own a required backend capability.

## Decision

Use ChatGPT Sites as Yukti's canonical UI and server runtime. Use its Cloudflare Worker-compatible Vinext starter, D1 binding for relational state, Sites-managed runtime secrets, and dispatch-owned Sign in with ChatGPT.

Implement background scanning as a signed idempotent `/api/jobs/run` endpoint. Judge mode can invoke it directly. After the approved GitHub push, a no-cost scheduled workflow may call it. The schedule contains no product logic and is not a second backend.

## Alternatives

### Sites plus Cloud Run and Supabase

Rejected initially because Sites already supplies server execution, secrets, authentication, and D1. Adding two external infrastructure owners would increase callback, deployment, cost, and failure surfaces without evidence that Sites is insufficient.

### Cloud Run-only application

Rejected because it would ignore the explicit Sites requirement and duplicate capabilities already available in the requested platform.

### Browser-only Sites application

Rejected because local or browser storage cannot safely own personal context, webhook idempotency, provider secrets, or payment authorization.

## Consequences

- The canonical persistence implementation targets D1/SQLite semantics rather than PostgreSQL.
- Route and domain code must remain portable enough for the approved Cloud Run fallback, but no fallback code is created speculatively.
- Public webhooks require a public deployment while user records remain sign-in-gated.
- Scheduled work depends on a signed endpoint and an external trigger after repository publication.
- Supabase is removed from the initial implementation plan.

## Verification

The decision is verified when a deployed Sites version reads/writes D1, reads secret runtime variables only on the server, completes SIWC identity, receives authenticated Linq and Prava requests, and successfully calls required provider APIs.

## Retirement and Falsifier

No Cloud Run or Supabase resources are created unless one of the invalidation conditions in `docs/evidence/sites-capability.md` occurs. If the fallback becomes necessary, this ADR is superseded with exact failing evidence and a single-backend replacement boundary.

