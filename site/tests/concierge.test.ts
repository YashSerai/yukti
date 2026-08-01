import { describe, expect, it } from "vitest";
import { conciergeReply, isRuleEligible, parseConciergeMessage } from "../domain/concierge";

describe("concierge memory parsing", () => {
  it("learns explicit relationship, preference, and budget facts", () => {
    expect(parseConciergeMessage("Sarah is my girlfriend. Sarah loves tulips. Budget for Sarah is $75").facts).toEqual([
      { personName: "Sarah", kind: "relationship", value: "girlfriend", origin: "explicit", confidence: 100 },
      { personName: "Sarah", kind: "preference", value: "tulips", origin: "explicit", confidence: 100 },
      { personName: "Sarah", kind: "budget", value: "7500 USD", origin: "explicit", confidence: 100 },
    ]);
  });

  it("creates recurring preparation without promising a recurring charge", () => {
    const parsed = parseConciergeMessage("Send Sarah flowers every 4 weeks under $70");
    expect(parsed.rule).toEqual({ personName: "Sarah", cadenceDays: 28, maximumAmountMinor: 7000, currency: "USD" });
    expect(conciergeReply(parsed)).toContain("ask before every purchase");
  });

  it("stores an explicit delivery location without inferring one", () => {
    expect(parseConciergeMessage("Sarah lives in Vancouver, BC.").facts).toContainEqual({
      personName: "Sarah", kind: "location", value: "Vancouver, BC", origin: "explicit", confidence: 100,
    });
  });

  it("honors opt-out and quiet hours", () => {
    expect(parseConciergeMessage("STOP").optOut).toBe(true);
    const rule = { enabled: true, nextEligibleAt: "2026-07-01T00:00:00.000Z", quietStartHour: 21, quietEndHour: 8 };
    expect(isRuleEligible(rule, new Date("2026-07-31T22:00:00.000Z"))).toBe(false);
    expect(isRuleEligible(rule, new Date("2026-07-31T15:00:00.000Z"))).toBe(true);
  });
});
