# Yukti

Yukti is an iMessage concierge that remembers the people you care about and stops at the spend boundary. Text it who Sarah is, what she likes, and the budget you prefer. Yukti keeps those facts editable, prepares a current flower option when a reminder is due, and turns the chosen item into a merchant- and amount-scoped Prava sandbox checkout.

Live demo: <https://yukti.yashns.chatgpt.site>

## Why it exists

Calendar assistants usually remind people that something matters, then leave the work untouched. Yukti brings the useful context, deadline, options, approval boundary, and transaction evidence into one flow. It is designed for consequential tasks where the user should not have to start from scratch, but the agent should not be allowed to spend freely.

## Product path

1. Sign in with GitHub. Yukti requests public profile access only.
2. Pair a messaging number and add the first person Yukti should remember.
3. Connect Google Calendar if you want upcoming events imported into **Today**.
4. Add or answer a personal task, or save a relationship preference and flower cadence through messaging.
5. Review a current product with its source, then approve the exact merchant, item, amount, and 15-minute window.
6. Create the Prava sandbox session and open its secure checkout. Scoped payment credentials remain server-side and are never returned to the browser or stored.

## Connected messaging path

1. Text the Yukti Linq number with an explicit relationship fact, preference, budget, delivery location, or flower cadence.
2. Open **People** to inspect, correct, or delete what Yukti learned and see which details came from your messages.
3. Save a flower reminder and select **Find a flower option**. Yukti requires a user-supplied destination, retrieves current products from FTD's public catalog, and uses Gemini 3.6 Flash to check the exact merchant page. Citations are stored with the snapshot; the merchant still confirms the address and delivery date.
4. Use **Find and text me** for the proactive iMessage prompt, or approve the exact live product from Yukti.
5. Continue through the same short-lived Prava sandbox boundary. A recurring reminder never becomes an automatic recurring charge.

Every signed-in user receives the same account-owned Today, People, Purchases, Activity, and Calendar product. The owner account is preloaded for the recorded walkthrough, but that data is never shown on the public landing page or in another user's account. [Real and simulated boundaries](docs/real-versus-simulated.md) are documented separately so the product interface can stay focused on the task.

## Architecture and controls

- Next.js and TypeScript on ChatGPT Sites' Cloudflare Worker-compatible runtime
- D1-backed users, approvals, transactions, audit events, OAuth attempts, sessions, and quotas
- Prava sandbox REST integration for scoped checkout sessions, result retrieval, and status reporting
- Senso retrieval feeding a constrained Gemini Flash decision brief
- GitHub OAuth with PKCE, single-use state, hashed server sessions, and no repository or email scope
- Same-origin mutation checks, per-user and global provider quotas, provider timeouts, one bounded 502/503/504 retry, redacted errors, and secret-only runtime configuration

Linq pairings, relationship memory, tasks, Calendar connections, approvals, and transactions are all scoped to the authenticated user. The shared provider keys remain server-side and do not grant one user access to another user's data.

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
- [Devfolio package](docs/devfolio-package.md)
- [Launch posts](docs/launch-posts.md)
- [Architecture decision](docs/adr/0001-hosting-boundary.md)
