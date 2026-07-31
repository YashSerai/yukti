# ChatGPT Sites Capability Evidence

Date: `2026-07-31`
Source boundary: bundled Sites plugin `0.1.31` and its current connector contracts

## Result

Yukti can use ChatGPT Sites as its canonical application host without a separate application backend. The app will use the Sites Vinext/Cloudflare Worker runtime, D1 for structured persistence, Sites-managed secret environment variables, and dispatch-owned Sign in with ChatGPT for user identity.

One external scheduler may call an authenticated Yukti job endpoint after the GitHub repository exists. It performs no product logic and does not become a second application backend.

## Capability Matrix

| Capability | Status | Evidence | Yukti decision |
|---|---|---|---|
| Server-side execution | Supported | The Sites starter emits Cloudflare Worker-compatible ESM and exposes a Worker `fetch` handler. | Route handlers and server components own secret-bearing work. |
| Persistent structured storage | Supported | Sites declares and provisions a logical D1 binding; the required guide specifies prepared statements, batch operations, schema files, and generated migrations. | Use D1 instead of Supabase for canonical product state. |
| Blob storage | Supported but unnecessary initially | Sites supports an optional logical R2 binding. | Leave R2 `null` until a real receipt or media workflow requires stored bytes. |
| Runtime environment variables and secrets | Supported | The Sites connector exposes production environment updates and supports secret-marked values without returning plaintext. | Store provider keys in Sites, never in hosting metadata or source. |
| ChatGPT user authentication | Supported | Dispatch-owned SIWC routes and forwarded authenticated-user headers are part of the starter contract. | Public landing page; sign-in-gated product routes and mutation endpoints. |
| External OAuth | Supported through provider-hosted flow | Server routes can create Composio managed-auth links; the browser can complete Google's hosted consent and return to a same-origin Yukti route. | Use Composio managed authentication rather than an app-owned Google OAuth stack. |
| Inbound HTTPS webhooks | Supported for application routes | The Worker fetch handler dispatches arbitrary application requests. Public deployment provides HTTPS routes. | Implement authenticated Linq webhook and Prava callback routes. |
| Outbound provider requests | Supported | The Worker runtime uses the standard Fetch API and Sites explicitly supports external connectors. | Call Gemini, Composio, Linq, Senso, and Prava only from server owners. |
| Scheduled execution | Not provided by the documented Sites contract | The Sites skills and hosting schema document request handling, deployment, D1, R2, auth, and runtime values but no cron binding. | Expose a signed idempotent job endpoint. Use manual judge-mode execution initially and a no-cost GitHub Actions schedule after the approved repository push. |
| Custom domains | Supported | The Sites connector can add and verify custom domains. | Use the Sites URL for the hackathon unless a domain materially improves the demo. |

## Security Consequences

- D1 access remains behind one server helper and uses prepared statements.
- Product mutations require SIWC identity except provider webhooks, which require their provider authentication and idempotency keys.
- The job endpoint requires a dedicated server secret and cannot be invoked by browser UI without authenticated authorization.
- Public application access is required for external webhooks; private product data remains protected by server-side identity checks.
- `.openai/hosting.json` stores only the Sites project ID and logical D1/R2 bindings.

## Cost Consequences

The selected path introduces no paid backend. Sites and its provisioned D1 are used within the available platform allocation. The external scheduler uses the repository's included automation allocation. Gemini remains the only separately authorized metered service, capped by the Yukti usage ledger.

## Invalidation Conditions

Revisit this result if Sites fails to deploy a route handler, cannot attach D1, cannot store runtime secrets, blocks external OAuth return routes, blocks authenticated provider webhooks, or cannot make required outbound HTTPS requests. Only then may the approved single Cloud Run backend fallback be introduced.

