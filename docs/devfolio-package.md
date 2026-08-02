# Devfolio submission package

This file is the copy-and-paste source for the final Devfolio entry. It is not a substitute for selecting **Publish Project** and confirming the status reads **Submitted**.

## Core fields

**Project name:** Yukti

**Tagline:** The gifting concierge that remembers the person and asks before it buys.

**Product link:** <https://yukti.yashns.chatgpt.site>

**Repository:** <https://github.com/YashSerai/yukti>

**Demo video:** Upload `yukti-demo-silent.mp4` as an unlisted YouTube video, then paste the URL here.

## Problem statement

Buying a thoughtful gift means remembering the person, the occasion, their preferences, a sensible budget, delivery constraints, and what is actually available now. Calendar reminders preserve the date but leave the work untouched. Generic shopping agents have the opposite problem: they can act quickly without making the user's exact authority clear.

## Project description

Yukti is a relationship-aware personal concierge that begins in iMessage and stops at an explicit spend boundary.

A user can text Yukti through Linq with a relationship, preference, budget, location, or gifting cadence. Yukti turns those messages into editable person memory. It can also import upcoming Google Calendar dates and manage account-owned jobs such as renewal or appointment follow-up. Senso retrieves the relevant context, and Gemini 3.6 Flash interprets messages and inspects a current merchant page. The user sees the source beside the option and approves one exact merchant, item, amount, and short expiry window.

Only then can Yukti create a scoped Prava sandbox checkout. The credential stays in the server-side transaction path, and Yukti records pending, completed, declined, provider-error, and revoked states without silently retrying an uncertain purchase.

The result is not a chatbot that asks the user to repeat everything. It is a small operating surface for what matters today, what Yukti remembers about each person, which tasks need input, the product evidence it found, the permission the user granted, and the transaction consequence. An hourly worker checks due flower rules and sends one idempotent suggestion per due cycle. It cannot approve a purchase.

## How it works

1. A signed Linq webhook receives a relationship, preference, budget, location, or cadence message.
2. Yukti saves explicit facts to the user's D1-backed memory record and keeps each fact correctable or deletable. Ambiguous requests trigger a follow-up question instead of a guess.
3. Composio imports the user's upcoming Google Calendar dates into Today when the user checks Calendar.
4. Senso retrieves the relevant context for a due gift or recurring flower rule.
5. Gemini 3.6 Flash checks the exact live merchant page and returns structured product evidence with a citation.
6. The user approves the merchant, item, amount, and 15-minute window.
7. Yukti creates a scoped Prava sandbox session and opens Prava's hosted checkout.
8. Yukti polls and reconciles the owned session, keeps credentials server-side, and can revoke an open checkout.

## Technologies used

Prava, Linq, Senso, Gemini 3.6 Flash, Composio, Codex, Next.js, TypeScript, Cloudflare Workers, D1, GitHub OAuth with PKCE, Vitest, Playwright, and HyperFrames.

## Track choices

Choose only tracks exposed by the Devfolio form. The strongest evidence is:

1. **Prava overall / Visa:** central approval-to-scoped-checkout flow, transaction lifecycle, and an attended Visa verification handoff.
2. **Linq:** iMessage is a core input and proactive output surface, with a signed webhook and a verified owner flow.
3. **Senso Discovery and Trust:** retrieved memory materially changes the product choice and is shown with attributable context.
4. **Localhost Most Startup-Ready Product:** a public, continuing-use product with clear control, privacy, and failure boundaries.
5. **OpenAI / Codex:** substantive engineering and release work completed with Codex during the build window, if that track is present.

6. **Composio:** the owner account has a user-authorized Google Calendar connection and a verified production event import. Choose this only if the form exposes a matching track.

## What worked

The public app, GitHub session boundary, onboarding, account-owned tasks, Calendar import, Linq memory flow, contextual clarification, editable People records, Senso retrieval, Gemini live-page inspection, cited product option, scheduled due-rule checks, D1 approval, Purchases ledger, Prava session creation, checkout handoff, polling, revocation, and provider readiness checks work in production. The owner flow also sent a proactive FTD suggestion through Linq without starting a charge.

## What did not fully work

Prava accepted the corrected sandbox card and reached Visa verification, but its SMS and email OTP did not arrive. The newest CAD 42 sandbox order remains `Pending`; no scoped credentials were issued and no completed payment is claimed. During live product research, Google Search grounding returned provider-side automated-query protection, so Yukti used Gemini URL Context against the exact merchant page and stored that citation.

## What we learned

Agentic commerce becomes useful when the authority is as clear as the recommendation. The product has to show which memory informed the choice, which product is current, exactly what the user approved, when that permission expires, and how an uncertain provider state is handled.

## Pre-existing work disclosure

The Yukti application, UX, integrations, tests, deployment, and submission materials were built during the official hackathon window. Before the event, the workspace contained planning context and local sponsor credentials, but no Yukti application.

## Screenshot order

The first image becomes the Devfolio cover.

Use the numbered files in the local `devfolio-assets` folder:

1. `01-yukti-cover.png` for the cover and core product idea.
2. `02-yukti-imessage.png` for the message-native entry point.
3. `03-yukti-memory-and-live-product.png` for editable memory and cited product research.
4. `04-yukti-exact-approval.jpg` for the merchant, item, amount, and expiry boundary.
5. `05-prava-visa-verification-redacted.png` as evidence only, never as a successful-payment claim.
6. `06-yukti-activity.png` for the integration and transaction trail.

## Final publishing checklist

- Record the final picture master against `docs/demo-script.md`, QA it scene by scene, upload it to YouTube as **Unlisted**, and paste the link.
- Upload screenshots in the order above and check that the first image crops well as the cover.
- Paste the project name, tagline, problem, description, technologies, links, and track evidence.
- Add every team member and confirm each required RSVP or check-in is complete.
- Review the entry for exposed keys, payment credentials, private calendar contents, phone numbers, or personal messages.
- Select **Publish Project**.
- Confirm the dashboard status reads **Submitted**.
- Take a timestamped screenshot of the submitted status for your records.

The live Devfolio schedule currently shows the event ending August 2, 2026 at 7:00 PM PT. The handbook also contains a separate 3:00 PM PT hard-deadline paragraph. Treat 3:00 PM PT as the safe cutoff unless the organizers resolve that conflict in writing.
