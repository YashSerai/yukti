import { z } from "zod";
import type { PaymentProvider, PaymentSessionRequest, PaymentSessionResult } from "../contracts";

const createSessionResponse = z.object({
  session_id: z.string().min(1), session_token: z.string().min(1), iframe_url: z.string().url(),
  order_id: z.string().min(1), expires_at: z.string().datetime(),
});
const paymentResultResponse = z.object({
  session_id: z.string(), order_id: z.string().nullable(), status: z.enum(["pending", "awaiting_result", "completed", "failed"]),
  transactions: z.array(z.object({
    txn_id: z.string(), status: z.string(), error: z.object({ code: z.string(), message: z.string() }).optional(),
    line_items: z.array(z.object({
      txn_ref_id: z.string(), merchant_name: z.string().nullable().optional(), total_amount: z.string(), status: z.string(),
      token: z.string().nullable(), dynamic_cvv: z.string().nullable(), expiry_month: z.string().nullable(), expiry_year: z.string().nullable(),
    })),
  })),
});
const reportResponse = z.object({ status: z.literal("confirmed"), txn_ref_id: z.string(), txn_status: z.enum(["APPROVED", "DECLINED"]), visa_confirmation: z.string() });

type Fetch = typeof fetch;
type ScopedCredentials = { token: string; dynamicCvv: string; expiryMonth: string; expiryYear: string };
export type MerchantOutcome = { status: "APPROVED" | "DECLINED"; authorizationCode?: string; responseCode?: string; amountPaid?: string };

export class PravaRequestError extends Error {
  constructor(readonly status: number, readonly code: string, readonly responseId: string | null) {
    super(`Prava request failed: ${code}`);
    this.name = "PravaRequestError";
  }
}

export class PravaResponseError extends Error {
  constructor(readonly issue: string) {
    super(`Prava returned an invalid response at ${issue}`);
    this.name = "PravaResponseError";
  }
}

export class PravaClient implements PaymentProvider {
  constructor(private readonly secretKey: string, private readonly fetcher: Fetch = globalThis.fetch.bind(globalThis), private readonly baseUrl = "https://sandbox.api.prava.space") {
    if (!secretKey.startsWith("sk_test_")) throw new Error("Yukti accepts only a Prava sandbox secret key");
  }

  private async request(path: string, init?: RequestInit) {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json", ...init?.headers },
    });
    if (!response.ok) {
      let code = "UNKNOWN";
      try {
        const body = await response.clone().json() as { error?: { code?: unknown } };
        if (typeof body.error?.code === "string") code = body.error.code;
      } catch { /* The status and response id still provide safe diagnostics. */ }
      throw new PravaRequestError(response.status, code, response.headers.get("x-response-id"));
    }
    return response;
  }

  async createSession(request: PaymentSessionRequest): Promise<PaymentSessionResult> {
    const amount = (request.item.amountMinor / 100).toFixed(2);
    const response = await this.request("/v1/sessions", { method: "POST", body: JSON.stringify({
      user_id: request.userId, user_email: request.userEmail, total_amount: amount, currency: request.currency,
      purchase_context: [{
        merchant_details: { name: request.merchant.name, url: request.merchant.url, country_code_iso2: request.merchant.countryCode },
        product_details: [{ product_id: request.item.id, description: request.item.description, unit_price: amount, quantity: request.item.quantity }],
        effective_until_minutes: 15,
      }],
      integration_type: "full_checkout",
      callback_url: request.callbackUrl,
      external_order_ref: request.item.id,
      description: request.item.description,
    }) });
    const parsed = createSessionResponse.safeParse(await response.json());
    if (!parsed.success) throw new PravaResponseError(parsed.error.issues[0]?.path.join(".") || "response");
    const data = parsed.data;
    return { sessionId: data.session_id, iframeUrl: data.iframe_url, expiresAt: data.expires_at,
      evidence: { sourceKind: "sandbox", provider: "prava", retrievedAt: new Date().toISOString(), reference: data.session_id } };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.request(`/v1/sessions/${encodeURIComponent(sessionId)}/revoke`, { method: "POST", body: "{}" });
  }

  async executeAwaitingPayment(sessionId: string, checkout: (credentials: ScopedCredentials) => Promise<MerchantOutcome>) {
    const result = paymentResultResponse.parse(await (await this.request(`/v1/sessions/${encodeURIComponent(sessionId)}/payment-result`)).json());
    if (result.status !== "awaiting_result") return { state: result.status as "pending" | "completed" | "failed" };
    const lineItems = result.transactions.flatMap((transaction) => transaction.line_items).filter((item) => item.status === "awaiting_result");
    if (lineItems.length !== 1) throw new Error("Prava returned an unexpected number of payable line items");
    const item = lineItems[0];
    if (!item.token || !item.dynamic_cvv || !item.expiry_month || !item.expiry_year) throw new Error("Prava payment credentials are incomplete");

    const outcome = await checkout({ token: item.token, dynamicCvv: item.dynamic_cvv, expiryMonth: item.expiry_month, expiryYear: item.expiry_year });
    const report = reportResponse.parse(await (await this.request(`/v1/sessions/${encodeURIComponent(sessionId)}/report-status`, {
      method: "POST", body: JSON.stringify({ txn_ref_id: item.txn_ref_id, txn_status: outcome.status, txn_type: "PURCHASE",
        authorization_code: outcome.authorizationCode, response_code: outcome.responseCode, amount_paid: outcome.amountPaid }),
    })).json());
    return { state: outcome.status === "APPROVED" ? "completed" as const : "failed" as const, reference: report.txn_ref_id, networkConfirmation: report.visa_confirmation };
  }
}
