# Yukti

Yukti prepares the small life-admin decisions that are easy to miss, then waits for explicit approval before money moves. The seeded judge path connects a birthday event and inspectable memory to two gift candidates, creates a single-use approval envelope, and hands the exact merchant and amount to Prava's sandbox checkout.

## Safety boundary

- Browser input names only a candidate. The server resolves the event, merchant, amount, currency, and owner from D1.
- Approvals expire after 15 minutes and are consumed atomically before a Prava session is created.
- Only `sk_test_` Prava keys are accepted. Live keys are rejected at configuration and adapter boundaries.
- Prava card credentials stay inside the server-side execution callback and are never returned, logged, or persisted.
- The default `seeded` mode records approvals but cannot contact Prava.
- `sandbox` mode can create and revoke Prava sandbox sessions. It cannot create a live charge.

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

The app runs on ChatGPT Sites through Vinext and Cloudflare Workers, with D1 as the durable store. Hosted Sites injects Sign in with ChatGPT identity headers; local `seeded` mode uses a clearly marked fixture identity.
