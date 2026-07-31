import { describe, expect, it } from "vitest";
import { authorizePurchase, type ApprovalEnvelope, type PurchaseAttempt } from "../lib/approval";

const approval: ApprovalEnvelope = {
  id: "approval-1", userId: "user-1", eventId: "event-1", candidateId: "candidate-1",
  merchant: "merchant.example", amountMinor: 4200, currency: "CAD",
  expiresAt: "2026-08-01T20:15:00.000Z", consumedAt: null,
};
const attempt: PurchaseAttempt = {
  userId: "user-1", eventId: "event-1", candidateId: "candidate-1",
  merchant: "merchant.example", amountMinor: 4200, currency: "CAD", now: "2026-08-01T20:00:00.000Z",
};

describe("purchase approval boundary", () => {
  it("allows the exact approved purchase", () => expect(authorizePurchase(approval, attempt)).toEqual({ ok: true }));
  it.each([
    ["merchant", "other.example", "merchant_mismatch"], ["amountMinor", 4300, "amountMinor_mismatch"],
    ["candidateId", "candidate-2", "candidateId_mismatch"], ["eventId", "event-2", "eventId_mismatch"],
  ] as const)("rejects a changed %s", (field, value, reason) => {
    expect(authorizePurchase(approval, { ...attempt, [field]: value })).toEqual({ ok: false, reason });
  });
  it("rejects an expired approval", () => expect(authorizePurchase(approval, { ...attempt, now: approval.expiresAt })).toEqual({ ok: false, reason: "approval_expired" }));
  it("rejects a consumed approval", () => expect(authorizePurchase({ ...approval, consumedAt: "2026-08-01T20:01:00.000Z" }, attempt)).toEqual({ ok: false, reason: "approval_consumed" }));
});
