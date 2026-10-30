export class RequestSecurityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Cookie-authenticated mutations must come from our own browser origin. */
export function assertMutationRequest(req: Request, json = true) {
  const origins = new Set([new URL(process.env.NEXTAUTH_URL || req.url).origin]);
  // Managed preview deployments have a distinct, server-configured origin.
  if (process.env.VERCEL_URL) origins.add(new URL(`https://${process.env.VERCEL_URL}`).origin);
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (((!origin || !origins.has(origin)) && !(origin === null && site === "same-origin")) || site === "cross-site" || site === "same-site") {
    throw new RequestSecurityError(403, "Request origin is not allowed");
  }
  if (json && req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new RequestSecurityError(415, "Content-Type must be application/json");
  }
}
