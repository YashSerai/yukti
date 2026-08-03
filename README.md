# Yukti

Yukti is a personal gifting concierge built for the Agentic Commerce Hackathon. It remembers who people are and what they like, imports upcoming Google Calendar events, finds a current gift option, and asks for approval before opening checkout.

The demo follows one simple path: tell Yukti that Sarah is your girlfriend, save her preferences and budget, let Yukti find a current bouquet, then approve the exact merchant, item, amount, and time window.

## How it works

- Linq carries the messaging conversation.
- Senso retrieves the relevant person and preference memory.
- Gemini 3.6 Flash interprets requests and checks the current merchant page.
- Composio imports Google Calendar events.
- Prava creates the scoped sandbox checkout after the user approves a purchase.

Yukti stores person memory in an editable profile. Recurring reminders and Calendar events can prepare a suggestion, but they cannot approve a purchase or create a recurring charge.

## Hackathon status

The web app, Calendar import, memory flow, live product research, approval record, and Prava checkout handoff are working. The Prava sandbox card reached Visa verification, but the OTP was not delivered, so the order remains pending and this project does not claim a completed payment.

Linq and Prava are demonstrated as hackathon integrations. Yukti is not a production payment service, and live payment details should not be entered.

## Run locally

The application lives in `site/`.

```powershell
cd site
npm ci
npm run dev
```

Run the verification checks with:

```powershell
npm run typecheck
npm test
npm run lint
npm run test:rendered
```

Provider credentials belong in ignored local environment files or hosted secrets. Do not commit them.

## Stack

Next.js, TypeScript, Cloudflare Workers, D1, Prava, Linq, Senso, Gemini 3.6 Flash, Composio, GitHub OAuth, Vitest, and Playwright.

## Links

- Hackathon submission materials: [`SUBMISSION.md`](SUBMISSION.md)
- Demo narration: [`docs/demo-script.md`](docs/demo-script.md)
- What is real and what is simulated: [`docs/real-versus-simulated.md`](docs/real-versus-simulated.md)
