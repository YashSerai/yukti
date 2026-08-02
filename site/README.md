# Yukti

Yukti is a messaging concierge for the people you care about. It learns relationship details you share, keeps each memory editable with its source, prepares current gift options on a chosen cadence, and waits for an exact approval before money moves. A preloaded owner account provides the hackathon walkthrough; every other account starts with its own empty workspace.

## Safety boundary

- Provider actions require an app-owned GitHub session. Yukti requests no repository or email scope, stores only the numeric GitHub identity and display metadata, and never persists the GitHub access token.
- OAuth state uses PKCE, a single-use D1 record, and a secure `HttpOnly` host cookie. Application sessions use a random internal user ID and a server-hashed secret.
- Sandbox mutations require a same-origin browser request. Per-user and global provider quotas, short network timeouts, and `429 Retry-After` responses bound accidental or scripted API-key use.
- Browser input names only a candidate. The server resolves the event, merchant, amount, currency, and owner from D1.
- Approvals expire after 15 minutes and are consumed atomically before a Prava session is created.
- Only `sk_test_` Prava keys are accepted. Live keys are rejected at configuration and adapter boundaries.
- Prava card credentials stay inside the server-side execution callback and are never returned, logged, or persisted.
- The default `seeded` mode records approvals but cannot contact Prava.
- `sandbox` mode can create and revoke Prava sandbox sessions. It cannot create a live charge.
- Linq webhooks are verified over the raw body, deduplicated by provider event ID, restricted to the configured Yukti line, and mapped to a user only after an expiring pairing code is confirmed from that user's phone.
- Recurring flower rules prepare recommendations. A scan requires an explicit delivery location and cited Gemini Google Search evidence. The merchant still confirms the exact address and date. Rules do not create recurring charges, and every product needs a fresh approval.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Generate migrations after a schema change:

```bash
npm run db:generate
```

The Sites build packages the D1 migrations from `drizzle/`. For a local Miniflare database, apply them with the generated Wrangler config after the first build:

```bash
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_outstanding_risque.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_github_auth_guardrails.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_relationship_concierge.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_user_onboarding.sql
```

Copy `.env.example` to an ignored local environment file or inject the same names through the runtime. Never commit real values.

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run test:rendered
```

The app runs on ChatGPT Sites through Vinext and Cloudflare Workers, with D1 as the durable store. Hosted provider actions use Yukti's GitHub OAuth session. Local development uses a fixture identity, but it exercises the same persisted onboarding and account-isolation paths.
