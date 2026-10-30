import { beforeEach, describe, expect, it, vi } from "vitest";
const { findOne, exists, update, migrate } = vi.hoisted(() => ({ findOne: vi.fn(), exists: vi.fn(), update: vi.fn(), migrate: vi.fn() }));
vi.mock("@/models/User", () => ({ default: { findOne, exists, findOneAndUpdate: update } }));
vi.mock("@/models/Expense", () => ({ default: { updateMany: migrate } }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
import { persistVerifiedIdentity, trustedLegacyExpenseEmail } from "../lib/identity";
const profile = { sub: "subject-1", email: "owner@example.test", email_verified: true, name: "Owner" };
function record(value: unknown) { return { lean: async () => value, select: () => ({ lean: async () => value }) }; }
beforeEach(() => { vi.clearAllMocks(); findOne.mockReturnValue(record(null)); exists.mockResolvedValue(null); update.mockResolvedValue({}); migrate.mockResolvedValue({}); });
describe("immutable Google identity binding", () => {
  it("rejects unverified profiles before querying or writing", async () => {
    await expect(persistVerifiedIdentity({ ...profile, email_verified: false })).rejects.toThrow();
    expect(findOne).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it("rejects an email already bound to another subject or an unbound legacy account", async () => {
    exists.mockResolvedValue({ _id: "existing" });
    await expect(persistVerifiedIdentity(profile)).rejects.toThrow("recovery");
    expect(update).not.toHaveBeenCalled(); expect(migrate).not.toHaveBeenCalled();
  });
  it("migrates only a previously bound account's historical rows and keys writes by subject", async () => {
    findOne.mockReturnValue(record({ googleId: profile.sub, email: "old@example.test" }));
    await persistVerifiedIdentity(profile);
    expect(migrate).toHaveBeenCalledWith({ userId: "old@example.test" }, { $set: { userId: profile.sub } });
    expect(update.mock.calls[0][0]).toEqual({ googleId: profile.sub });
    expect(update.mock.calls[0][1].$set.legacyExpenseEmail).toBeNull();
  });
  it("never grants new accounts an email fallback", async () => {
    await persistVerifiedIdentity(profile);
    expect(migrate).not.toHaveBeenCalled();
    expect(update.mock.calls[0][1].$set.legacyExpenseEmail).toBeNull();
  });
  it("does not overwrite a different binding on an email-index collision", async () => {
    update.mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce(null);
    await expect(persistVerifiedIdentity(profile)).rejects.toThrow("conflict");
    expect(update.mock.calls[1][0]).toEqual({ googleId: profile.sub, email: profile.email });
  });
  it("derives historical access from the subject-bound record, never a supplied email", async () => {
    findOne.mockReturnValue(record({ email: "trusted@example.test" }));
    expect(await trustedLegacyExpenseEmail(profile.sub)).toBe("trusted@example.test");
    expect(findOne).toHaveBeenCalledWith({ googleId: profile.sub });
    findOne.mockReturnValue(record({ email: "reassigned@example.test", legacyExpenseEmail: null }));
    expect(await trustedLegacyExpenseEmail(profile.sub)).toBeUndefined();
  });
});
