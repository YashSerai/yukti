# Yukti judge demo

Target length: 2 minutes.

## Before recording

- Open <https://yukti.yashns.chatgpt.site> in a clean window.
- Confirm GitHub returns `@YashSerai`.
- Run **Audit → Check connections** once.
- Keep the Prava sandbox test card ready. Do not show any API key, browser credential, or private calendar content.

## Script

**0:00 — The problem**

“A calendar reminder tells me Sarah's birthday is coming up, but the real task is everything after the reminder. Yukti prepares that work and stops before it spends.”

Show the birthday event, the known-context line, and the two seeded candidates. Point out that fixture evidence is labelled.

**0:20 — Retrieval and reasoning**

Select **Prepare with Gemini 3.6 Flash**.

“Senso retrieves the relevant memory excerpt. Gemini explains why each bounded candidate fits, and it must preserve the warning that availability and delivery are still fixture data.”

**0:40 — Exact authority**

Choose the tea set, select **Review and approve**, and read the merchant, amount, and 15-minute expiry.

“This approval is server-owned, single-use, and tied to one candidate, merchant, currency, and amount. Changing any of those fields invalidates it.”

Approve, then create the Prava sandbox session.

**1:05 — Transaction**

Open the secure Prava checkout and use only the sandbox test card.

“Yukti never sees or stores the card entry. Prava securely collects it and issues scoped credentials only after this approved session.”

Return to Yukti and select **Verify sandbox result**.

- If Prava returns `awaiting_result`: show Yukti's scoped-credential receipt and the reported sandbox merchant decline.
- If Prava still returns `pending`: say, “Prava still reports this provider-owned session as pending, so Yukti does not claim a completed transaction or retry the purchase.” Do not substitute a mocked success.

**1:35 — Trust and evidence**

Open **Audit**.

“The shared keys stay server-side. GitHub protects sponsor actions without repository or email access. Provider checks are rate-limited, and Composio calendar data and Linq messaging are not exposed through this public multi-user demo.”

**1:55 — Close**

“Yukti's product insight is simple: an agent can do the preparation, but money needs a small, visible envelope of authority.”

