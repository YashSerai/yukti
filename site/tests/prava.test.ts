import { describe, expect, it, vi } from "vitest";
import { PravaClient, PravaRequestError } from "../providers/prava/client";

const request = { userId: "user-1", userEmail: "judge@example.com", merchant: { name: "Paper Hound", url: "https://paperhound.ca", countryCode: "CA" }, item: { id: "cand-book", description: "The Art of Still Life", quantity: 1, amountMinor: 3800 }, currency: "CAD" };

describe("Prava sandbox adapter", () => {
  it("surfaces only safe provider diagnostics", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { code: "VAL_2001", message: "secret detail" } }), {
      status: 400, headers: { "x-response-id": "response-safe" },
    })) as unknown as typeof fetch;
    const client = new PravaClient("sk_test_example", fetcher);
    await expect(client.createSession(request)).rejects.toEqual(expect.objectContaining<Partial<PravaRequestError>>({
      status: 400, code: "VAL_2001", responseId: "response-safe",
    }));
  });

  it("creates a merchant and amount scoped session", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ total_amount: "38.00", currency: "CAD", integration_type: "full_checkout", purchase_context: [{ merchant_details: { name: "Paper Hound", url: "https://paperhound.ca", country_code_iso2: "CA" }, product_details: [{ product_id: "cand-book", unit_price: "38.00", quantity: 1 }] }] });
      return new Response(JSON.stringify({ session_id: "sess_test", session_token: "jwt", iframe_url: "https://sandbox.collect.prava.space/?session=sess_test", order_id: "ord_test", expires_at: "2026-08-01T20:15:00.000Z" }), { status: 201 });
    });
    const result = await new PravaClient("sk_test_fake", fetcher as typeof fetch).createSession(request);
    expect(result).toMatchObject({ sessionId: "sess_test", evidence: { sourceKind: "sandbox", provider: "prava" } });
  });

  it("keeps credentials inside the checkout callback and reports the known outcome", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith("payment-result")) return new Response(JSON.stringify({ session_id: "sess_test", order_id: "ord_test", status: "awaiting_result", transactions: [{ txn_id: "txn", status: "awaiting_result", line_items: [{ txn_ref_id: "line", total_amount: "38.00", status: "awaiting_result", token: "virtual-token", dynamic_cvv: "123", expiry_month: "12", expiry_year: "2030" }] }] }));
      expect(JSON.parse(String(init?.body))).toMatchObject({ txn_ref_id: "line", txn_status: "DECLINED", txn_type: "PURCHASE" });
      return new Response(JSON.stringify({ status: "confirmed", txn_ref_id: "line", txn_status: "DECLINED", visa_confirmation: "SUCCESS" }));
    });
    const client = new PravaClient("sk_test_fake", fetcher as typeof fetch);
    const result = await client.executeAwaitingPayment("sess_test", async (credentials) => {
      expect(credentials).toEqual({ token: "virtual-token", dynamicCvv: "123", expiryMonth: "12", expiryYear: "2030" });
      return { status: "DECLINED", responseCode: "05" };
    });
    expect(result).toEqual({ state: "failed", reference: "line", networkConfirmation: "SUCCESS" });
    expect(JSON.stringify(result)).not.toContain("virtual-token");
  });

  it("sends an explicit JSON body when revoking", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init).toMatchObject({ method: "POST", body: "{}" });
      return new Response(JSON.stringify({ status: "revoked" }));
    });
    await new PravaClient("sk_test_fake", fetcher as typeof fetch).revokeSession("sess_test");
  });
});
