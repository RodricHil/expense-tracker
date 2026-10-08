import { beforeEach, describe, expect, it, vi } from "vitest";
const { session, count, find, update, exists } = vi.hoisted(() => ({ session: vi.fn(), count: vi.fn(), find: vi.fn(), update: vi.fn(), exists: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/expenses", () => ({ ownerId: () => "owner-id", ownerFilter: () => ({ userId: "owner-id" }) }));
vi.mock("@/models/Expense", () => ({ default: { exists } }));
vi.mock("@/models/ExpenseOption", () => ({ default: { countDocuments: count, findOne: find, findOneAndUpdate: update } }));
import { POST } from "@/app/api/expense-options/import/route";
import { categories } from "@/lib/expense-options";
beforeEach(() => {
  vi.clearAllMocks(); session.mockResolvedValue({ user: { email: "owner@example.test" } });
  count.mockResolvedValue(0); exists.mockResolvedValue(true); find.mockResolvedValue(null); update.mockResolvedValue({});
});
describe("private legacy category import", () => {
  it("requires authentication", async () => {
    session.mockResolvedValue(null); expect((await POST()).status).toBe(401); expect(update).not.toHaveBeenCalled();
  });
  it("does not give new accounts default categories", async () => {
    exists.mockResolvedValue(null); expect(await (await POST()).json()).toEqual({ imported: false }); expect(update).not.toHaveBeenCalled();
  });
  it("imports separate owned records without changing expenses", async () => {
    expect((await POST()).status).toBe(200);
    expect(exists).toHaveBeenCalledWith({ userId: "owner-id", type: { $in: categories } });
    expect(update).toHaveBeenCalledTimes(categories.length);
    for (const [filter, change] of update.mock.calls) {
      expect(filter).toMatchObject({ userId: "owner-id", kind: "category" });
      expect(change.$set.legacyType).toBe(filter.name);
      expect(change.$set).not.toHaveProperty("archived");
    }
  });
  it("preserves renamed and deleted imported categories", async () => {
    find.mockResolvedValue({ name: "Renamed", archived: true });
    expect((await POST()).status).toBe(200); expect(update).not.toHaveBeenCalled();
  });
  it("skips completed imports on future loads", async () => {
    count.mockResolvedValue(categories.length); expect(await (await POST()).json()).toEqual({ imported: false });
    expect(exists).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
});
