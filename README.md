# Yukti

Yukti is an iMessage concierge that remembers the people you care about and stops at the spend boundary. Text it who Sarah is, what she likes, and the budget you prefer. Yukti keeps those facts editable, prepares a current flower option when a reminder is due, and turns the chosen item into a merchant- and amount-scoped Prava sandbox checkout.

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

## Connected owner path

1. Text the Yukti Linq number with an explicit relationship fact, preference, budget, delivery location, or flower cadence.
2. Open **People** to inspect, correct, or delete what Yukti learned and see its Linq provenance.
3. Save a flower reminder and run **Find a live flower option**. Yukti requires a user-supplied destination, retrieves current products from FTD's public catalog, and asks Gemini 3.6 Flash to check the exact option. It attempts Google Search grounding and falls back on a search-quota response to URL Context for the exact merchant page. Citations are stored with the snapshot; the merchant still confirms the address and delivery date.
4. Use **Prepare and text me** for the proactive iMessage prompt, or approve the exact live product from the console.
5. Continue through the same short-lived Prava sandbox boundary. A recurring reminder never becomes an automatic recurring charge.

The public experience is deliberately seeded. Product recommendations, delivery claims, and personal facts are fixtures unless the interface explicitly labels a connected source.

## Architecture and controls

- Next.js and TypeScript on ChatGPT Sites' Cloudflare Worker-compatible runtime
- D1-backed users, approvals, transactions, audit events, OAuth attempts, sessions, and quotas
- Prava sandbox REST integration for scoped checkout sessions, result retrieval, and status reporting
- Senso retrieval feeding a constrained Gemini Flash decision brief
- GitHub OAuth with PKCE, single-use state, hashed server sessions, and no repository or email scope
- Same-origin mutation checks, per-user and global provider quotas, provider timeouts, one bounded 502/503/504 retry, redacted errors, and secret-only runtime configuration

The connected Linq and relationship-memory workflow is available only to the mapped owner identity. Public judges receive the seeded view and cannot access the owner's phone, messages, memory, reminders, or shared Composio Calendar connection.

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
