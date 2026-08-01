# Yukti

Yukti is an iMessage concierge for the people you care about. It learns explicit relationship details from its Linq conversation, keeps each fact editable with its source, prepares current flower options on a chosen cadence, and waits for an exact approval before money moves. The seeded birthday path remains available for judges.

## Safety boundary

- Sponsor integrations require an app-owned GitHub session. Yukti requests no repository or email scope, stores only the numeric GitHub identity and display metadata, and never persists the GitHub access token.
- OAuth state uses PKCE, a single-use D1 record, and a secure `HttpOnly` host cookie. Application sessions use a random internal user ID and a server-hashed secret.
- Sandbox mutations require a same-origin browser request. Per-user and global provider quotas, short network timeouts, and `429 Retry-After` responses bound accidental or scripted API-key use.
- Browser input names only a candidate. The server resolves the event, merchant, amount, currency, and owner from D1.
- Approvals expire after 15 minutes and are consumed atomically before a Prava session is created.
- Only `sk_test_` Prava keys are accepted. Live keys are rejected at configuration and adapter boundaries.
- Prava card credentials stay inside the server-side execution callback and are never returned, logged, or persisted.
- The default `seeded` mode records approvals but cannot contact Prava.
- `sandbox` mode can create and revoke Prava sandbox sessions. It cannot create a live charge.
- Linq webhooks are verified over the raw body, deduplicated by provider event ID, and restricted to the configured owner line and recipient.
- Recurring flower rules prepare recommendations. They do not create recurring charges, and every product still needs a fresh approval.

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

The app runs on ChatGPT Sites through Vinext and Cloudflare Workers, with D1 as the durable store. Hosted sponsor actions use Yukti's GitHub OAuth session; local `seeded` mode uses a clearly marked fixture identity.
