import { describe, expect, it } from "vitest";

import { redact, serializeError } from "@/lib/logger";

/**
 * lib/logger.ts promises in its own header that it never carries "a connection
 * string" or an email address. serializeError originally passed error.message
 * and error.stack through verbatim, which broke that promise: driver errors
 * quote the URI they failed to connect to, so a MongoDB outage would have
 * written MONGODB_URI's credentials into the log stream — a worse leak than the
 * ET-M2 console.logs this module was introduced to replace.
 */
describe("redact", () => {
  it("strips credentials from a mongodb+srv connection string", () => {
    const out = redact(
      "MongoServerError: auth failed for mongodb+srv://appuser:s3cr3tP%40ss@cluster0.abc.mongodb.net/expense"
    );

    expect(out).not.toContain("s3cr3tP%40ss");
    expect(out).not.toContain("appuser");
    expect(out).toContain("mongodb+srv://[redacted]@cluster0.abc.mongodb.net/expense");
  });

  it("strips credentials from any scheme, not just mongodb", () => {
    expect(redact("failed: postgres://u:p@db:5432/x")).toBe(
      "failed: postgres://[redacted]@db:5432/x"
    );
    expect(redact("GET https://key:secret@api.example.com/v1")).toBe(
      "GET https://[redacted]@api.example.com/v1"
    );
  });

  it("strips bare email addresses (ET-M2)", () => {
    expect(redact("duplicate key for person@example.com")).toBe(
      "duplicate key for [redacted-email]"
    );
  });

  it("leaves innocuous text untouched", () => {
    const clean = "E11000 duplicate key error collection: expense.users index: email_1";
    expect(redact(clean)).toBe(clean);
  });

  it("does not mangle a URL that has no credentials", () => {
    const url = "connect ECONNREFUSED https://cluster0.abc.mongodb.net:27017";
    expect(redact(url)).toBe(url);
  });
});

describe("serializeError", () => {
  it("redacts both the message and the stack", () => {
    const error = new Error("connect failed mongodb://root:hunter2@db:27017/app");
    error.stack = "Error: connect failed mongodb://root:hunter2@db:27017/app\n    at connect()";

    const out = serializeError(error);

    expect(out.errorName).toBe("Error");
    expect(String(out.errorMessage)).not.toContain("hunter2");
    expect(String(out.stack)).not.toContain("hunter2");
    expect(String(out.stack)).toContain("at connect()");
  });

  it("handles a non-Error throw without leaking", () => {
    const out = serializeError("boom mongodb://a:b@h/db");

    expect(out.errorName).toBe("string");
    expect(String(out.errorMessage)).not.toContain(":b@");
  });

  it("omits stack when the error has none", () => {
    const error = new Error("plain");
    error.stack = undefined;

    expect(serializeError(error).stack).toBeUndefined();
  });
});
