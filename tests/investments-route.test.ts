import { beforeEach, describe, expect, it, vi } from "vitest";
const { session, model, chain } = vi.hoisted(() => {
  const chain = { select: vi.fn(), sort: vi.fn(), skip: vi.fn(), limit: vi.fn(), lean: vi.fn() };
  return { session: vi.fn(), chain, model: { aggregate: vi.fn(), find: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), findOneAndDelete: vi.fn() } };
});
vi.mock("next-auth", () => ({ getServerSession: session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Investment", () => ({ default: model }));
import { GET, POST, PUT, DELETE } from "../app/api/investments/route";
const id = "507f1f77bcf86cd799439011";
const record = { name: "Index fund", type: "sip", status: "active", currency: "₹", investedCents: 100000, currentValueCents: null, contributionCents: 10000, frequency: "monthly", startDate: "2026-01-01", maturityDate: null };
const request = (method = "GET", body?: unknown, origin = "https://example.test") => new Request("https://example.test/api/investments?currency=%E2%82%B9", { method, headers: { Origin: origin, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => {
  vi.clearAllMocks(); session.mockResolvedValue({ user: { id: "owner" } });
  for (const key of ["select", "sort", "skip", "limit"] as const) chain[key].mockReturnValue(chain);
  chain.lean.mockResolvedValue([]); model.find.mockReturnValue(chain);
  model.aggregate.mockResolvedValue([{ count: [], summary: [] }]);
  model.create.mockResolvedValue({ _id: id }); model.findOneAndUpdate.mockResolvedValue({ _id: id }); model.findOneAndDelete.mockResolvedValue({ _id: id });
});
describe("private investment API", () => {
  it("requires authentication for every operation", async () => {
    session.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect((await POST(request("POST", record))).status).toBe(401);
    expect((await PUT(request("PUT", { id, record }))).status).toBe(401);
    expect((await DELETE(request("DELETE", { id }))).status).toBe(401);
    expect(model.aggregate).not.toHaveBeenCalled(); expect(model.create).not.toHaveBeenCalled();
  });
  it("scopes reads and summaries by owner, currency, type, status and literal search", async () => {
    const response = await GET(new Request("https://example.test/api/investments?currency=%E2%82%B9&type=sip&status=active&q=a%2Bb%5B1%5D&page=2"));
    expect(response.status).toBe(200);
    const filter = model.aggregate.mock.calls[0][0][0].$match;
    expect(filter).toEqual({ userId: "owner", currency: "₹", type: "sip", status: "active", name: { $regex: "a\\+b\\[1\\]", $options: "i" } });
    expect(model.find).toHaveBeenCalledWith(filter);
    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const data = await response.json(); expect(data.page).toBe(1); expect(data.summary.investedCents).toBe(0);
  });
  it("returns filtered totals for the entire result, with bounded records and no owner identifiers", async () => {
    model.aggregate.mockResolvedValue([{ count: [{ total: 45 }], summary: [{ investedCents: 999000, valuedInvestedCents: 500000, currentValueCents: 600000, premiumsCents: 12000, investmentCount: 40, valuedCount: 20, insuranceCount: 5 }] }]);
    chain.lean.mockResolvedValue([{ _id: id, ...record }]);
    const data = await (await GET(new Request("https://example.test/api/investments?currency=%E2%82%B9&page=2"))).json();
    expect(chain.skip).toHaveBeenCalledWith(20); expect(data.total).toBe(45); expect(data.pages).toBe(3);
    expect(data.summary.currentValueCents - data.summary.valuedInvestedCents).toBe(100000);
    expect(data.records[0].id).toBe(id); expect(data.records[0]).not.toHaveProperty("userId");
    const grouping = model.aggregate.mock.calls[0][0][1].$facet.summary[0].$group;
    expect(grouping.premiumsCents.$sum.$cond[1]).toBe("$investedCents");
    expect(grouping.investedCents.$sum.$cond[1]).toBe(0);
  });
  it("writes only validated fields with the immutable owner", async () => {
    expect((await POST(request("POST", record))).status).toBe(201);
    expect(model.create).toHaveBeenCalledWith({ ...record, userId: "owner" });
    expect((await POST(request("POST", { ...record, userId: "victim" }))).status).toBe(400);
    expect(model.create).toHaveBeenCalledTimes(1);
  });
  it("rejects foreign-origin writes and secret fields before mutation", async () => {
    expect((await POST(request("POST", record, "https://attacker.test"))).status).toBe(403);
    expect((await POST(request("POST", { ...record, policyNumber: "12345678" }))).status).toBe(400);
    expect(model.create).not.toHaveBeenCalled();
  });
  it("scopes updates and deletes inside their database conditions", async () => {
    expect((await PUT(request("PUT", { id, record }))).status).toBe(200);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ _id: id, userId: "owner", currency: "₹" }, { $set: record }, { new: true, runValidators: true });
    expect((await DELETE(request("DELETE", { id }))).status).toBe(200);
    expect(model.findOneAndDelete).toHaveBeenCalledWith({ _id: id, userId: "owner" });
  });
  it("cannot relabel an existing rupee holding as dollars", async () => {
    model.findOneAndUpdate.mockImplementation(async (filter) => filter.currency === "₹" ? { _id: id } : null);
    expect((await PUT(request("PUT", { id, record: { ...record, currency: "$" } }))).status).toBe(404);
    expect(model.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: id, userId: "owner", currency: "$" });
  });
  it("does not disclose whether another user's record exists", async () => {
    model.findOneAndUpdate.mockResolvedValue(null); model.findOneAndDelete.mockResolvedValue(null);
    expect((await PUT(request("PUT", { id, record }))).status).toBe(404);
    expect((await DELETE(request("DELETE", { id }))).status).toBe(404);
  });
  it("rejects operator injection and malformed IDs", async () => {
    expect((await DELETE(request("DELETE", { id: { $ne: null } }))).status).toBe(400);
    expect((await GET(new Request("https://example.test/api/investments?currency=%E2%82%B9&type=invalid"))).status).toBe(400);
    expect(model.findOneAndDelete).not.toHaveBeenCalled(); expect(model.aggregate).not.toHaveBeenCalled();
  });
});
