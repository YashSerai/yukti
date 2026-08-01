import { describe, expect, it } from "vitest";
import { isAllowedLinqEvent, linqInboundEvent, verifyLinqWebhook } from "../providers/linq/webhook";

describe("Linq webhook boundary", () => {
  it("verifies the raw body and rejects stale or changed deliveries", async () => {
    const secret = `whsec_${btoa("01234567890123456789012345678901")}`;
    const body = JSON.stringify({ hello: "world" });
    const timestamp = "1000";
    const signature = await sign(secret, `event-1.${timestamp}.${body}`);
    const headers = new Headers({ "webhook-id": "event-1", "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` });
    await expect(verifyLinqWebhook(secret, body, headers, 1100)).resolves.toBe(true);
    await expect(verifyLinqWebhook(secret, `${body} `, headers, 1100)).resolves.toBe(false);
    await expect(verifyLinqWebhook(secret, body, headers, 1401)).resolves.toBe(false);
  });

  it("accepts only the pinned inbound payload shape", () => {
    const event = linqInboundEvent.parse({ webhook_version: "2026-02-03", event_type: "message.received", event_id: "event", created_at: new Date().toISOString(), data: {
      chat: { id: "chat", is_group: false, owner_handle: { handle: "+12134989364", is_me: true } }, id: "message", direction: "inbound",
      sender_handle: { handle: "+17782316707", is_me: false }, parts: [{ type: "text", value: "Sarah likes tulips" }],
    } });
    expect(event.data.parts[0]).toMatchObject({ type: "text", value: "Sarah likes tulips" });
    expect(isAllowedLinqEvent(event, "+12134989364", "+17782316707")).toBe(true);
    expect(isAllowedLinqEvent(event, "+12134989364", "+15555550100")).toBe(false);
    expect(isAllowedLinqEvent({ ...event, data: { ...event.data, chat: { ...event.data.chat, is_group: true } } }, "+12134989364", "+17782316707")).toBe(false);
  });
});

async function sign(secret: string, value: string) {
  const key = Uint8Array.from(atob(secret.slice(6)), (character) => character.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...digest));
}
