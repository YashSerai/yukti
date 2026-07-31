import type { PaymentProvider, PaymentSessionRequest, PaymentSessionResult } from "../contracts";

export class FixturePaymentProvider implements PaymentProvider {
  async createSession(request: PaymentSessionRequest): Promise<PaymentSessionResult> {
    return {
      sessionId: `fixture-${request.item.id}`,
      iframeUrl: "/?fixture=payment",
      expiresAt: "2026-08-01T20:15:00.000Z",
      evidence: { sourceKind: "fixture", provider: "fixture", retrievedAt: "2026-08-01T20:00:00.000Z" },
    };
  }
  async revokeSession() {}
}
