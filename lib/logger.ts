/**
 * Minimal server-side structured logger.
 *
 * WHY THIS EXISTS (roadmap Round 7, task 8 / §G.5)
 * ------------------------------------------------
 * The Round 3 error handling made every failure return a generic 500 with no
 * internals — correct for the client, but it also made those 500s invisible:
 * `console.error("Unhandled API error:", err)` emits an unstructured, unsearchable,
 * uncorrelatable blob into the platform log stream. This module turns each one
 * into a single JSON line with a stable shape, so the host's log search (Vercel,
 * CloudWatch, Loki, …) can filter on `level`, `event` and `errorId` today, with no
 * account, no DSN and no vendor SDK.
 *
 * NOT A REPLACEMENT FOR ERROR TRACKING. The roadmap asks for Sentry or
 * equivalent; installing it needs an account and a real DSN, and a fake DSN is
 * strictly worse than nothing (it fails silently and hides the errors it claims
 * to report). The integration point is `emit()` below — a human with an account
 * adds the SDK and one `captureException` call there, and every existing call
 * site starts reporting with no further edits. See SECURITY.md and the Round 7
 * handover notes.
 *
 * PII RULES (ET-M2). This logger is not allowed to carry personal data. Log the
 * opaque Google `sub`, an ObjectId, or a request path — never an email address,
 * a display name, a raw request body, or a connection string. `serializeError`
 * keeps the stack server-side only; nothing here is ever returned to a client
 * except the generated `errorId`, which is a random correlation token.
 *
 * SERVER ONLY. Import this from route handlers and other server modules only.
 * It is not marked with the `server-only` package because that would add a
 * runtime dependency for a compile-time assertion; keep it out of "use client"
 * files by convention.
 */

export type LogLevel = "error" | "warn" | "info";

/** Structured context. Scalars only — keep bodies and PII out. */
export type LogContext = Record<string, string | number | boolean | null | undefined>;

type LogRecord = LogContext & {
  timestamp: string;
  level: LogLevel;
  event: string;
};

/**
 * Single write point. One JSON object per line: `console.error` is the only
 * transport that is guaranteed to reach the log stream on every host this app
 * can run on (Node server, serverless function, edge runtime).
 *
 * ← Wire an error tracker in HERE, not at the call sites.
 */
function emit(record: LogRecord): void {
  const line = JSON.stringify(record);

  if (record.level === "error") {
    console.error(line);
    return;
  }

  if (record.level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

/**
 * Short random correlation id. Returned to the client alongside the generic 500
 * so a user can quote it in a bug report and it can be found in the logs — it
 * carries no information by itself, which is the point.
 */
export function newErrorId(): string {
  return globalThis.crypto.randomUUID().slice(0, 8);
}

/**
 * Reduce an unknown thrown value to safe, structured fields.
 * `stack` is included because these records never leave the server.
 */
export function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }

  return { errorName: typeof error, errorMessage: String(error) };
}

export function logInfo(event: string, context: LogContext = {}): void {
  emit({ timestamp: new Date().toISOString(), level: "info", event, ...context });
}

export function logWarn(event: string, context: LogContext = {}): void {
  emit({ timestamp: new Date().toISOString(), level: "warn", event, ...context });
}

/**
 * Log a server-side failure and return the correlation id that identifies it.
 * Pass that id back to the client; keep everything else here.
 */
export function logError(
  event: string,
  error: unknown,
  context: LogContext = {}
): string {
  const errorId = newErrorId();

  emit({
    timestamp: new Date().toISOString(),
    level: "error",
    event,
    errorId,
    ...context,
    ...serializeError(error),
  });

  return errorId;
}
