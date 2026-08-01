# Real versus simulated

## Real and currently verified

- Public ChatGPT Sites deployment and D1 persistence
- GitHub OAuth login as `@YashSerai`, with public-profile access only
- Senso retrieval from the Yukti organization
- Gemini 3.6 Flash structured generation
- Server-recorded, user-scoped, single-use purchase approval
- Prava sandbox session creation, hosted checkout opening, result polling, revocation, and status-reporting integration
- Linq sandbox line health
- Composio Google Calendar connection for `yukti-owner`

## Seeded or simulated

- Sarah, her birthday, preferences, and the candidate products
- Merchant inventory, delivery, and pickup statements
- Granville Tea Co. and Paper Hound checkout execution
- The final merchant result after Prava issues scoped sandbox credentials: Yukti's deterministic merchant adapter returns a test-card decline and reports it to Prava

## Not claimed

- No live purchase, order, delivery, or charge
- No production Prava credential
- No user calendar event read, created, changed, or deleted through the public app
- No Linq message sent as part of the public product flow
- No OpenAI API inference inside the product

The demo may show a real Prava sandbox credential lifecycle without showing the credential itself. If Prava remains `pending`, Yukti reports that state and does not imply credential issuance or checkout completion.

