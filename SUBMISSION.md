# Yukti submission copy

## Project name

Yukti

## Tagline

The gifting concierge that remembers the person and asks before it buys.

## Problem

Buying a thoughtful gift is rarely one task. You have to remember the date, recall what the person likes, set a sensible budget, find something current, check whether it can arrive, and then make the purchase. Calendar reminders preserve the deadline but leave the rest of that work to you.

## Product

Yukti turns that scattered process into one controlled flow. A user can text Yukti through Linq with facts such as who someone is, what they like, the budget they prefer, and where the gift needs to go. Yukti keeps those memories visible and editable, imports upcoming dates from Google Calendar, and supports account-owned jobs such as passport renewal and appointment follow-up. Senso retrieves the relevant context, while Gemini 3.6 Flash interprets messages and inspects a current merchant page. Yukti then presents one concrete option with its source and asks for exact approval of the merchant, item, amount, and expiry window.

Only that approval can open a Prava sandbox checkout. A reminder can prepare a purchase, but it cannot silently become a charge.

The product is a quiet workspace rather than another open-ended chat window. Today shows what needs attention, People shows what Yukti remembers, Purchases holds approvals and checkout state, Activity records meaningful changes, and Calendar imports upcoming dates on demand and once a day. Gemini adds a practical preparation note and, when useful, one follow-up question to new or changed Calendar events. A deployed hourly worker checks due flower rules and sends at most one idempotent suggestion for each due cycle. Purchases still require attended approval.

## How Prava is used

Prava is Yukti's transaction boundary, not a decorative payment button. Yukti creates a single-use approval, validates its owner and expiry, and creates a merchant- and amount-scoped Prava sandbox session. Payment credentials remain inside the server-side callback path and are never persisted or returned to the browser. Yukti can poll the owned session, reconcile the checkout return, record a known merchant result, and revoke an open session. It never retries an uncertain purchase.

The attended sandbox run accepted the corrected Prava test card and reached Visa verification. The OTP was not delivered, so the newest CAD 42 order remains `Pending` and no scoped credentials were issued. The demo states that boundary plainly and does not claim a completed transaction.

## Sponsor technology

- **Prava:** scoped sandbox checkout sessions, owned-session polling, revocation, reconciliation, and result reporting
- **Linq:** signed inbound iMessage webhook, relationship-memory capture, automated replies, and idempotent proactive gift suggestions
- **Senso:** attributable retrieval of person and preference context that materially influences the recommendation
- **Gemini 3.6 Flash:** constrained live-page product research with stored citations and bounded usage
- **Composio:** user-authorized Google Calendar connection and event import into each account's Today view
- **Codex:** product engineering, security review, testing, deployment, copy audit, and release verification during the build window

## What worked

The public product, GitHub identity boundary, guided onboarding, account-owned People and tasks, Calendar import, Linq-to-memory flow, contextual clarification, editable memory, Senso retrieval, Gemini live-page research, cited product card, scheduled due-rule checks, D1-backed approval, Purchases ledger, Prava sandbox session creation, checkout handoff, result polling, revocation, and provider readiness checks work in production. The owner account also sent an attended proactive FTD suggestion through Linq without starting a charge.

## What did not fully work

Prava's hosted checkout reached Visa verification, but neither its SMS nor email OTP arrived. The corresponding sandbox order is still `Pending`, so Yukti has not received scoped credentials and does not claim a successful payment. Google Search grounding also returned provider-side automated-query protection during the live product run; Yukti used Gemini URL Context against the exact FTD page and retained that citation instead.

## What we learned

The hard part of agentic commerce is not producing another recommendation. It is making authority legible: whose context was used, what exact purchase was approved, how long that permission lasts, where payment credentials can exist, and what the product does when a provider result is uncertain.

## Built during the hackathon

The Yukti application, product design, provider adapters, relationship-memory flow, approval model, security controls, tests, deployment, and submission materials were created during the official build window. The starting workspace contained planning context and local sponsor credentials, but no Yukti application.

## Links

- Product: <https://yukti.yashns.chatgpt.site>
- Repository: <https://github.com/YashSerai/yukti>
- Demo video: upload the local final MP4 and paste its public or unlisted URL here
