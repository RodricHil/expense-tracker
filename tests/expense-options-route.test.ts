import { beforeEach, describe, expect, it, vi } from "vitest";
const { getSession, find, update, connectDB } = vi.hoisted(() => ({ getSession: vi.fn(), find: vi.fn(), update: vi.fn(), connectDB: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/mongodb", () => ({ connectDB }));
vi.mock("@/lib/expenses", () => ({ ownerId: () => "owner-id" }));
vi.mock("@/models/ExpenseOption", () => ({ default: { find, findOneAndUpdate: update } }));
import { GET, POST, PUT, DELETE } from "@/app/api/expense-options/route";
const id = "507f1f77bcf86cd799439011";
const request = (method: string, body: unknown) => new Request("https://example.test/api/expense-options", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); getSession.mockResolvedValue({ user: { id: "owner-id", email: "owner@example.test" } }); });
describe("personal category management", () => {
  it("rejects every unauthenticated operation", async () => {
    getSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    for (const [method, handler] of [["POST", POST], ["PUT", PUT], ["DELETE", DELETE]] as const) expect((await handler(request(method, { id, kind: "category", name: "Hobbies" }))).status).toBe(401);
    expect(connectDB).not.toHaveBeenCalled();
  });
  it("reads only the signed-in user's options, retaining archived labels", async () => {
    const chain = { select: vi.fn(), sort: vi.fn(), limit: vi.fn(), lean: vi.fn().mockResolvedValue([{ _id: id, name: "Hobbies", archived: true }]) };
    chain.select.mockReturnValue(chain); chain.sort.mockReturnValue(chain); chain.limit.mockReturnValue(chain); find.mockReturnValue(chain);
    const res = await GET(); expect(res.status).toBe(200); expect(find).toHaveBeenCalledWith({ userId: "owner-id" }); expect((await res.json()).options[0].archived).toBe(true);
  });
  it("renames categories with ownership inside the write filter", async () => {
    update.mockResolvedValue({ _id: id, kind: "category", name: "Travel" });
    expect((await PUT(request("PUT", { id, name: "Travel", userId: "another-user" }))).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ _id: id, userId: "owner-id", kind: "category", archived: { $ne: true } }, { $set: { name: "Travel" } }, expect.objectContaining({ runValidators: true }));
  });
  it("cannot rename another user's category or a UPI app", async () => {
    update.mockResolvedValue(null); expect((await PUT(request("PUT", { id, name: "Travel" }))).status).toBe(404);
    expect(update.mock.calls[0][0]).toMatchObject({ userId: "owner-id", kind: "category" });
  });
  it("archives a category without deleting or rewriting expenses", async () => {
    update.mockResolvedValue({ _id: id, kind: "category", name: "Hobbies", archived: true });
    expect((await DELETE(request("DELETE", { id }))).status).toBe(200);
    expect(update).toHaveBeenCalledWith({ _id: id, userId: "owner-id", kind: "category" }, { $set: { archived: true } }, expect.any(Object));
  });
  it("rejects operator ids and empty names before writing", async () => {
    expect((await PUT(request("PUT", { id: { $ne: null }, name: "Travel" }))).status).toBe(400);
    expect((await PUT(request("PUT", { id, name: " " }))).status).toBe(400); expect(update).not.toHaveBeenCalled();
  });
  it("reports duplicate names without exposing database details", async () => {
    update.mockRejectedValue({ code: 11000 }); expect((await PUT(request("PUT", { id, name: "Travel" }))).status).toBe(409);
  });
});

describe("personal UPI app management", () => {
  it("creates UPI apps for the authenticated owner", async () => {
    update.mockResolvedValue({ _id: id, kind: "upiApp", name: "Paytm" });
    expect((await POST(request("POST", { kind: "upiApp", name: "Paytm", userId: "another-user" }))).status).toBe(200);
    expect(update.mock.calls[0][0]).toEqual({ userId: "owner-id", kind: "upiApp", name: "Paytm" });
  });
  it("renames only an owned active UPI app", async () => {
    update.mockResolvedValue({ _id: id, kind: "upiApp", name: "My UPI" });
    expect((await PUT(request("PUT", { id, kind: "upiApp", name: "My UPI" }))).status).toBe(200);
    expect(update.mock.calls[0][0]).toEqual({ _id: id, userId: "owner-id", kind: "upiApp", archived: { $ne: true } });
  });
  it("archives only the owner's UPI app and reports missing foreign records", async () => {
    update.mockResolvedValue(null);
    expect((await DELETE(request("DELETE", { id, kind: "upiApp", userId: "another-user" }))).status).toBe(404);
    expect(update.mock.calls[0][0]).toEqual({ _id: id, userId: "owner-id", kind: "upiApp" });
    expect(update.mock.calls[0][1]).toEqual({ $set: { archived: true } });
  });
});
