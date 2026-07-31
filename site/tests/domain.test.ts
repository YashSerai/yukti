import { describe, expect, it } from "vitest";
import { transition } from "../domain/state-machine";
import { redact } from "../lib/redaction";
import { createRegistry } from "../providers/registry";
import { FixturePaymentProvider } from "../providers/fixture/payment";

describe("domain safety", () => {
  it("permits canonical transitions", () => expect(transition("approved", "purchasing")).toBe("purchasing"));
  it("rejects skipping approval", () => expect(() => transition("ready_for_approval", "purchasing")).toThrow(/Illegal action transition/));
  it("permits reconciliation from unknown outcome", () => expect(transition("outcome_unknown", "completed")).toBe("completed"));
  it("redacts secrets and card-like values", () => expect(redact({ authorization: "Bearer secret", dynamic_cvv: "123", note: "sk_test_example 4111 1111 1111 1111" })).toEqual({ authorization: "[REDACTED]", dynamic_cvv: "[REDACTED]", note: "[REDACTED_KEY] [REDACTED_PAN]" }));
  it("cannot enter sandbox mode without Prava", () => expect(() => createRegistry("sandbox", { fixture: new FixturePaymentProvider() })).toThrow(/Prava provider is required/));
});
