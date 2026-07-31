export type SourceKind = "fixture" | "sandbox" | "connected";
export type ProviderEvidence = { sourceKind: SourceKind; provider: string; retrievedAt: string; reference?: string };
export type ProviderFailure = { code: string; publicMessage: string; retryable: boolean; traceId?: string };

export interface PaymentSessionRequest {
  userId: string; userEmail: string; merchant: { name: string; url: string; countryCode: string };
  item: { id: string; description: string; quantity: number; amountMinor: number }; currency: string; callbackUrl?: string;
}
export interface PaymentSessionResult { sessionId: string; iframeUrl: string; expiresAt: string; evidence: ProviderEvidence }
export interface PaymentProvider {
  createSession(request: PaymentSessionRequest): Promise<PaymentSessionResult>;
  revokeSession(sessionId: string): Promise<void>;
}

export interface EvidenceProvider { search(query: string): Promise<{ claims: string[]; evidence: ProviderEvidence }> }
export interface MessagingProvider { sendApprovedMessage(to: string, body: string): Promise<{ messageId: string; evidence: ProviderEvidence }> }
export interface ContextProvider { listUpcomingEvents(userId: string): Promise<{ events: unknown[]; evidence: ProviderEvidence }> }
