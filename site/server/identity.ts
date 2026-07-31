const encoder = new TextEncoder();

export type RequestIdentity = {
  id: string;
  displayName: string;
  email: string;
};

export async function identityFromRequest(
  request: Request,
  mode: string | undefined,
): Promise<RequestIdentity | null> {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const displayName = decodeName(encodedName) ?? email;

  if (email) return { id: await stableId(email), displayName: displayName ?? "Yukti user", email };
  if (mode === undefined || mode === "seeded" || mode === "development") {
    const demoEmail = "judge-demo@example.com";
    return { id: await stableId(demoEmail), displayName: "Yukti judge", email: demoEmail };
  }
  return null;
}

async function stableId(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return `usr_${Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function decodeName(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
