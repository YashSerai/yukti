# Yukti submission copy

## Tagline

The life-admin agent that prepares decisions and stops at the spend boundary.

## Problem

Important personal tasks arrive as calendar events, half-remembered preferences, and deadlines. Existing assistants can remind you, but they rarely assemble the context, narrow the choices, obtain precise consent, and carry the task into a safe transaction.

## What Yukti does

Yukti prepares an upcoming obligation before it becomes urgent. In the seeded judge flow, it retrieves relevant memory through Senso, uses Gemini 3.6 Flash to explain two bounded gift candidates, and asks the user to approve one exact merchant, item, amount, and expiry window. Only then does it create a Prava sandbox checkout. The payment credential stays inside the server-side transaction path, and Yukti records whether Prava is pending, completed, or received a known sandbox merchant decline.

The interaction is intentionally not a chatbot. It is a quiet workspace for reviewing evidence, making one decision, and seeing the consequence.

## Prava implementation

Prava is the transaction boundary, not a decorative payment button. Yukti creates a single-use server approval, validates ownership and expiry, creates a merchant- and amount-scoped Prava sandbox session, opens Prava's secure collection flow, checks the payment result, and reports a known merchant outcome back to Prava. Scoped credentials are handled only inside the server callback and are neither persisted nor returned to the browser.

## Sponsor technology

- **Prava:** secure sandbox payment session and result lifecycle
- **Senso:** attributable retrieval of the seeded preference context
- **Gemini 3.6 Flash:** constrained decision brief with structured output and bounded usage
- **Codex:** substantive product engineering, security review, tests, deployment, and release verification during the hackathon
- **Composio:** active Google Calendar connection and readiness verification; real calendar contents are not exposed through the shared public judge account
- **Linq:** healthy sandbox line and tested idempotent messaging adapter; outbound messaging is not claimed as a completed public workflow

## What worked

The public app, GitHub identity boundary, Senso-to-Gemini preparation, D1 approval, Prava session creation, provider readiness checks, and cancellation path work end to end. Composio is connected to Google Calendar under the intended Yukti owner identity.

## What did not fully work yet

In the recorded July 31 sandbox run, Prava accepted the hosted test-card form but remained on its provider-owned “Securing your card details…” state; the API continued to report `pending` and had not issued scoped credentials. Yukti now exposes that state honestly and can finalize and report the deterministic merchant-test decline as soon as Prava returns `awaiting_result`.

## What we learned

The difficult part of agentic commerce is not generating another recommendation. It is making authority legible: whose context was used, what exact purchase was approved, how long that authority lasts, where credentials can exist, and what happens when a provider result is uncertain.

## Built during the hackathon

The application code, product design, provider adapters, security controls, tests, deployment, and submission materials were created during the hackathon build window. The starting workspace contained planning context and local sponsor credentials, but no Yukti application.

