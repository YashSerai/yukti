import { z } from "zod";

export const approvalEnvelopeSchema = z.object({
  id: z.string().min(1), userId: z.string().min(1), eventId: z.string().min(1), candidateId: z.string().min(1),
  merchant: z.string().min(1), amountMinor: z.number().int().positive(), currency: z.string().length(3),
  expiresAt: z.string().datetime(), consumedAt: z.string().datetime().nullable(),
});
export type ApprovalEnvelope = z.infer<typeof approvalEnvelopeSchema>;
export type PurchaseAttempt = Omit<ApprovalEnvelope, "id" | "expiresAt" | "consumedAt"> & { now: string };

export function authorizePurchase(envelope: ApprovalEnvelope, attempt: PurchaseAttempt) {
  const approval = approvalEnvelopeSchema.parse(envelope);
  if (approval.consumedAt) return { ok: false as const, reason: "approval_consumed" };
  if (Date.parse(attempt.now) >= Date.parse(approval.expiresAt)) return { ok: false as const, reason: "approval_expired" };
  const fields = ["userId", "eventId", "candidateId", "merchant", "amountMinor", "currency"] as const;
  for (const field of fields) if (approval[field] !== attempt[field]) return { ok: false as const, reason: `${field}_mismatch` };
  return { ok: true as const };
}
