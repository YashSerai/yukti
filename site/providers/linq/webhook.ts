import { z } from "zod";

const handle = z.object({ handle: z.string(), is_me: z.boolean() });
export const linqInboundEvent = z.object({
  webhook_version: z.literal("2026-02-03"), event_type: z.literal("message.received"), event_id: z.string().min(1), created_at: z.string(),
  data: z.object({
    chat: z.object({ id: z.string().min(1), is_group: z.boolean(), owner_handle: handle }),
    id: z.string().min(1), direction: z.literal("inbound"), sender_handle: handle,
    parts: z.array(z.discriminatedUnion("type", [z.object({ type: z.literal("text"), value: z.string() }), z.object({ type: z.literal("media") }).passthrough()])),
  }),
});
export type LinqInboundEvent = z.infer<typeof linqInboundEvent>;

export function isAllowedLinqEvent(event: LinqInboundEvent, ownerLine: string, ownerRecipient: string) {
  return !event.data.chat.is_group && event.data.chat.owner_handle.is_me && event.data.chat.owner_handle.handle === ownerLine &&
    !event.data.sender_handle.is_me && event.data.sender_handle.handle === ownerRecipient;
}

export async function verifyLinqWebhook(secret: string, rawBody: string, headers: Headers, nowSeconds = Math.floor(Date.now() / 1000)) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (!id || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  try {
    const key = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (character) => character.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signed = new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, signed));
    return signature.split(" ").some((candidate) => candidate.startsWith("v1,") && constantTimeEqual(expected, fromBase64(candidate.slice(3))));
  } catch { return false; }
}

function fromBase64(value: string) { try { return Uint8Array.from(atob(value), (character) => character.charCodeAt(0)); } catch { return new Uint8Array(); } }
function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}
