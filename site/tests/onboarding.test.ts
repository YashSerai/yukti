import { describe, expect, it } from "vitest";
import { normalizePhone } from "../server/onboarding-handler";

describe("onboarding phone boundary", () => {
  it("normalizes North American and E.164 numbers", () => {
    expect(normalizePhone("(778) 231-6707")).toBe("+17782316707");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("rejects ambiguous or malformed numbers", () => {
    expect(normalizePhone("778231670")).toBeNull();
    expect(normalizePhone("555-CALL-ME")).toBeNull();
  });
});
