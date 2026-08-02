# Yukti submission copy

## Project name

Yukti

## Tagline

The gifting concierge that remembers the person and asks before it buys.

## Problem

Buying a thoughtful gift is rarely one task. You have to remember the date, recall what the person likes, set a sensible budget, find something current, check whether it can arrive, and then make the purchase. Calendar reminders preserve the deadline but leave the rest of that work to you.

## Product

Yukti turns that scattered process into one controlled flow. A user can text Yukti through Linq with facts such as who Sarah is, what she likes, the budget they prefer, and where the gift needs to go. Yukti keeps those memories visible and editable, retrieves the relevant context through Senso, and uses Gemini 3.6 Flash to inspect a current merchant page. It then presents one concrete option with its source and asks for exact approval of the merchant, item, amount, and expiry window.

Only that approval can open a Prava sandbox checkout. A reminder can prepare a purchase, but it cannot silently become a charge.

The product is a quiet workspace rather than another open-ended chat window. Today shows what needs attention, People shows what Yukti remembers, Wallet holds approvals and checkout state, and Activity makes the integration and transaction trail legible.

## How Prava is used

Prava is Yukti's transaction boundary, not a decorative payment button. Yukti creates a single-use approval, validates its owner and expiry, and creates a merchant- and amount-scoped Prava sandbox session. Payment credentials remain inside the server-side callback path and are never persisted or returned to the browser. Yukti can poll the owned session, reconcile the checkout return, record a known merchant result, and revoke an open session. It never retries an uncertain purchase.

The attended sandbox run accepted the corrected Prava test card and reached Visa verification. The OTP was not delivered, so the newest CAD 42 order remains `Pending` and no scoped credentials were issued. The demo states that boundary plainly and does not claim a completed transaction.

## Sponsor technology

- **Prava:** scoped sandbox checkout sessions, owned-session polling, revocation, reconciliation, and result reporting
- **Linq:** signed inbound iMessage webhook, relationship-memory capture, automated replies, and idempotent proactive gift suggestions
- **Senso:** attributable retrieval of person and preference context that materially influences the recommendation
- **Gemini 3.6 Flash:** constrained live-page product research with stored citations and bounded usage
- **Composio:** verified Google Calendar connection for the private owner account; the public judge account does not receive access to the shared calendar
- **Codex:** product engineering, security review, testing, deployment, copy audit, and release verification during the build window

## What worked

The public product, GitHub identity boundary, Linq-to-memory flow, editable People records, Senso retrieval, Gemini live-page research, cited product card, D1-backed approval, Prava sandbox session creation, checkout handoff, result polling, revocation, and provider readiness checks work in production. The connected owner flow also sent an attended proactive FTD suggestion through Linq and recorded a 15-minute, single-use USD 45 approval for Sarah without starting a charge.

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
