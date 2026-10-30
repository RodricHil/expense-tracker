import { afterEach, describe, expect, it, vi } from "vitest";
import { assertMutationRequest } from "../lib/request-security";
const req = (headers: Record<string, string> = {}) => new Request("https://app.example.test/api/expenses", { method: "POST", headers: { "Content-Type": "application/json", ...headers } });
afterEach(() => vi.unstubAllEnvs());
describe("mutation request protection", () => {
  it("accepts same-origin browser JSON requests", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.test");
    expect(() => assertMutationRequest(req({ Origin: "https://app.example.test" }))).not.toThrow();
  });
  it.each(["https://attacker.test", "https://sibling.example.test", "null"])("rejects foreign or opaque origin %s", (origin) => {
    expect(() => assertMutationRequest(req({ Origin: origin }))).toThrow("origin");
  });
  it("rejects missing provenance and simple text/plain submissions", () => {
    expect(() => assertMutationRequest(req())).toThrow("origin");
    expect(() => assertMutationRequest(req({ Origin: "https://app.example.test", "Content-Type": "text/plain" }))).toThrow("Content-Type");
  });
  it("requires same-origin provenance for the bodyless import endpoint", () => {
    expect(() => assertMutationRequest(req({ Origin: "https://attacker.test" }), false)).toThrow("origin");
    expect(() => assertMutationRequest(req({ "Sec-Fetch-Site": "same-origin" }), false)).not.toThrow();
  });
  it("uses configured origin instead of trusting a forged request URL", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://canonical.example.test");
    expect(() => assertMutationRequest(req({ Origin: "https://app.example.test" }))).toThrow("origin");
  });
});
