# Yukti

Yukti is a life-admin agent that prepares decisions and stops at the spend boundary. The judge demo turns a remembered birthday preference into two explainable gift options, records one exact approval, and opens a merchant- and amount-scoped Prava sandbox checkout.

Live demo: <https://yukti.yashns.chatgpt.site>

## Why it exists

Calendar assistants usually remind people that something matters, then leave the work untouched. Yukti brings the useful context, deadline, options, approval boundary, and transaction evidence into one flow. It is designed for consequential tasks where the user should not have to start from scratch, but the agent should not be allowed to spend freely.

## Judge path

1. Sign in with GitHub. Yukti requests public profile access only.
2. Open **Audit** and run **Check connections**.
3. Return to **Today** and prepare the birthday decision brief with Senso and Gemini 3.6 Flash.
4. Review one candidate and approve the exact merchant, item, amount, and 15-minute window.
5. Create the Prava sandbox session and open its secure checkout.
6. Complete the hosted test-card flow, then use **Verify sandbox result** in Yukti. Scoped payment credentials remain server-side and are never returned to the browser or stored.

The public experience is deliberately seeded. Product recommendations, delivery claims, and personal facts are fixtures unless the interface explicitly labels a connected source.

## Architecture and controls

- Next.js and TypeScript on ChatGPT Sites' Cloudflare Worker-compatible runtime
- D1-backed users, approvals, transactions, audit events, OAuth attempts, sessions, and quotas
- Prava sandbox REST integration for scoped checkout sessions, result retrieval, and status reporting
- Senso retrieval feeding a constrained Gemini Flash decision brief
- GitHub OAuth with PKCE, single-use state, hashed server sessions, and no repository or email scope
- Same-origin mutation checks, per-user and global provider quotas, provider timeouts, one bounded 502/503/504 retry, redacted errors, and secret-only runtime configuration

Composio Google Calendar and Linq are connected/readiness-checked but are not presented as completed user workflows. The shared sponsor identities are intentionally not exposed as public multi-user data or messaging surfaces.

## Local verification

From `site/`:

```powershell
npm ci
npm run typecheck
npm test
npm run lint
npm run test:rendered
```

Runtime credentials belong in ignored local environment files or Sites secrets. Never commit them.

## Submission material

- [Demo script](docs/demo-script.md)
- [Eligibility checklist](docs/eligibility.md)
- [Real versus simulated](docs/real-versus-simulated.md)
- [Submission copy](SUBMISSION.md)
- [Architecture decision](docs/adr/0001-hosting-boundary.md)

