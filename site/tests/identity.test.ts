import { describe, expect, it } from "vitest";
import { identityFromRequest } from "../server/identity";

describe("request identity", () => {
  it("derives a stable opaque id without returning the email as the id", async () => {
    const request = new Request("https://yukti.example", { headers: {
      "oai-authenticated-user-email": "Judge@Example.com",
      "oai-authenticated-user-full-name": "Yash%20Serai",
    } });
    const first = await identityFromRequest(request, "sandbox");
    const second = await identityFromRequest(request, "sandbox");
    expect(first).toEqual(second);
    expect(first?.id).toMatch(/^usr_[a-f0-9]{24}$/);
    expect(first?.id).not.toContain("judge@example.com");
    expect(first?.email).toBe("judge@example.com");
    expect(first?.displayName).toBe("Yash Serai");
  });

  it("permits a fixture identity only in non-connected modes", async () => {
    const request = new Request("https://yukti.example");
    expect(await identityFromRequest(request, "seeded")).not.toBeNull();
    expect(await identityFromRequest(request, "sandbox")).toBeNull();
    expect(await identityFromRequest(request, "connected")).toBeNull();
  });
});
