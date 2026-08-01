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
- Signed Linq inbound message, owner-only reply, editable relationship memory, and proactive message to the owner's phone
- Current FTD catalog retrieval and exact merchant product URL
- Destination gate that blocks product approval without an explicit location and cited Google Search evidence

## Seeded or simulated

- The seeded public Sarah birthday, preferences, and tea/book candidates
- Merchant inventory, delivery, and pickup statements
- Granville Tea Co. and Paper Hound checkout execution
- The final merchant result after Prava issues scoped sandbox credentials: Yukti's deterministic merchant adapter returns a test-card decline and reports it to Prava

## Not claimed

- No live purchase, order, delivery, or charge
- No production Prava credential
- No user calendar event read, created, changed, or deleted through the public app
- Linq messages are limited to the configured owner test number; public judges cannot send or inspect them
- No claim that the merchant can deliver to a specific address or date until the merchant confirms it
- No OpenAI API inference inside the product

The demo may show a real Prava sandbox credential lifecycle without showing the credential itself. If Prava remains `pending`, Yukti reports that state and does not imply credential issuance or checkout completion.
