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
- Google Calendar event import into the owner's Today view
- Signed Linq inbound message, owner-only reply, editable relationship memory, and proactive message to the owner's phone
- Current FTD catalog retrieval and exact merchant product URL
- Destination gate that blocks product approval without an explicit location and cited Gemini URL Context evidence
- Hourly scheduled dry-run of due flower rules with quiet hours and idempotency

## Seeded or simulated

- Sarah's preloaded owner-account birthday, preferences, and tea/book walkthrough candidates
- Merchant inventory, delivery, and pickup statements
- Granville Tea Co. and Paper Hound checkout execution
- The final merchant result after Prava issues scoped sandbox credentials: Yukti's deterministic merchant adapter returns a test-card decline and reports it to Prava

## Not claimed

- No live purchase, order, delivery, or charge
- No production Prava credential
- No Calendar event is created, changed, or deleted by Yukti
- The owner Linq flow is production-verified; additional users can pair their own number but a second live sender has not been attended in production
- No claim that the merchant can deliver to a specific address or date until the merchant confirms it
- No OpenAI API inference inside the product

The demo may show a real Prava sandbox credential lifecycle without showing the credential itself. If Prava remains `pending`, Yukti reports that state and does not imply credential issuance or checkout completion.
