# Yukti submission copy

## Tagline

The gifting concierge that remembers the person and asks before it buys.

## Problem

Important personal tasks arrive as calendar events, half-remembered preferences, and deadlines. Existing assistants can remind you, but they rarely assemble the context, narrow the choices, obtain precise consent, and carry the task into a safe transaction.

## What Yukti does

Yukti learns who someone is to you, their preferences, budget, location, and a gifting cadence through Linq. When a gift is due, it retrieves relevant memory through Senso, uses Gemini 3.6 Flash to inspect a current merchant page, and asks the user to approve one exact merchant, item, amount, and expiry window. Only then can it create a Prava sandbox checkout. The payment credential stays inside the server-side transaction path, and Yukti records whether Prava is pending, completed, or received a known sandbox merchant decline.

The interaction is intentionally not a chatbot. It is a quiet workspace for reviewing evidence, making one decision, and seeing the consequence.

## Prava implementation

Prava is the transaction boundary, not a decorative payment button. Yukti creates a single-use server approval, validates ownership and expiry, creates a merchant- and amount-scoped Prava sandbox session, opens Prava's secure collection flow, checks the payment result, and reports a known merchant outcome back to Prava. Scoped credentials are handled only inside the server callback and are neither persisted nor returned to the browser.

## Sponsor technology

- **Prava:** secure sandbox payment session and result lifecycle
- **Senso:** attributable retrieval of the seeded preference context
- **Gemini 3.6 Flash:** constrained product research with URL citations, structured output, and bounded usage
- **Codex:** substantive product engineering, security review, tests, deployment, and release verification during the hackathon
- **Composio:** active Google Calendar connection and readiness verification; real calendar contents are not exposed through the shared public judge account
- **Linq:** signed iMessage webhook, relationship-memory capture, automated reply, and idempotent proactive suggestion delivery to the configured owner

## What worked

The public app, GitHub identity boundary, Linq-to-memory flow, Senso retrieval, Gemini live-page research, cited product card, D1 approval, Prava session creation, provider readiness checks, and cancellation path work end to end. Composio is connected to Google Calendar under the intended Yukti owner identity. The production demo recorded a 15-minute approval for FTD's Sweet & Pretty Bouquet at USD 45 for Sarah in Vancouver without starting a charge.

## What did not fully work yet

In the recorded July 31 sandbox run, Prava accepted the hosted test-card form but remained on its provider-owned `Securing your card details...` state. Its dashboard still shows the matching CAD 42 order as `Pending`, with seven orders but zero transactions, and the API has not issued scoped credentials. Yukti exposes that state honestly and can finalize and report the deterministic merchant-test decline as soon as Prava returns `awaiting_result`.

## What we learned

The difficult part of agentic commerce is not generating another recommendation. It is making authority legible: whose context was used, what exact purchase was approved, how long that authority lasts, where credentials can exist, and what happens when a provider result is uncertain.

## Built during the hackathon

The application code, product design, provider adapters, security controls, tests, deployment, and submission materials were created during the hackathon build window. The starting workspace contained planning context and local sponsor credentials, but no Yukti application.
