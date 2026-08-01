import { identityFromSession } from "./github-auth";

export type RequestIdentity = {
  id: string;
  displayName: string;
  email: string;
  login?: string;
};

export async function identityFromRequest(
  request: Request,
  db: D1Database,
  mode: string | undefined,
): Promise<RequestIdentity | null> {
  const session = await identityFromSession(request, db);
  if (session) return session;
  if (mode === undefined || mode === "seeded" || mode === "development") {
    const demoEmail = "judge-demo@example.com";
    return { id: "usr_seeded_judge", displayName: "Yukti judge", email: demoEmail, login: "judge-demo" };
  }
  return null;
}
