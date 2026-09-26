import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/cards — ownership, the 5-per-type limit, and the guarantee that only a
 * type, nickname and last four digits are ever written. Everything below the
 * handler is mocked; no database, secret or network is needed.
 */

const getServerSession = vi.fn();
const connectDB = vi.fn(async () => undefined);

const cardModel = {
  find: vi.fn(),
  countDocuments: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
  findOneAndDelete: vi.fn(),
  exists: vi.fn(),
};
const expenseModel = { updateMany: vi.fn() };

vi.mock("next-auth", () => ({
  default: vi.fn(() => vi.fn()),
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", name: "Google", type: "oauth" })),
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: () => connectDB() }));
vi.mock("@/models/Card", () => ({ default: cardModel }));
vi.mock("@/models/Expense", () => ({ default: expenseModel }));
vi.mock("@/models/User", () => ({ default: { findOneAndUpdate: vi.fn() } }));

const { DELETE, GET, POST, PUT } = await import("@/app/api/cards/route");

const OWNER_SUB = "108000000000000000001";
const OWNER_EMAIL = "owner@example.test";
const CARD_ID = "65a1b2c3d4e5f60718293a4b";

function signIn() {
  getServerSession.mockResolvedValue({ user: { id: OWNER_SUB, email: OWNER_EMAIL, name: "Owner" } });
}

function jsonRequest(method: string, body: unknown) {
  return new Request("https://example.test/api/cards", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const storedCard = { _id: CARD_ID, type: "credit", name: "HDFC Credit", last4: "4582" };
const newCard = { type: "credit", name: "HDFC Credit", last4: "4582" };

beforeEach(() => {
  vi.clearAllMocks();
  connectDB.mockResolvedValue(undefined);
  cardModel.countDocuments.mockResolvedValue(0);
  cardModel.create.mockResolvedValue(storedCard);
});

describe("authentication", () => {
  it.each([
    ["GET", () => GET()],
    ["POST", () => POST(jsonRequest("POST", newCard))],
    ["PUT", () => PUT(jsonRequest("PUT", { ...newCard, id: CARD_ID }))],
    ["DELETE", () => DELETE(jsonRequest("DELETE", { id: CARD_ID }))],
  ])("%s returns 401 without a session and never touches the database", async (_verb, call) => {
    getServerSession.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(connectDB).not.toHaveBeenCalled();
  });
});

describe("GET /api/cards", () => {
  it("lists only the caller's cards and returns only safe fields", async () => {
    signIn();
    const chain = { sort: vi.fn(() => chain), lean: vi.fn(async () => [{ ...storedCard, userId: OWNER_SUB, __v: 0 }]) };
    cardModel.find.mockReturnValue(chain);

    const res = await GET();

    expect(cardModel.find).toHaveBeenCalledWith({ userId: OWNER_SUB });
    expect(await res.json()).toEqual({ cards: [{ id: CARD_ID, type: "credit", name: "HDFC Credit", last4: "4582" }] });
  });
});

describe("POST /api/cards", () => {
  it("creates a card owned by the caller with only type, name and last4", async () => {
    signIn();

    const res = await POST(jsonRequest("POST", { ...newCard, number: "4111111111114582", cvv: "123", expiry: "12/30", userId: "someone-else" }));

    expect(res.status).toBe(201);
    expect(cardModel.create).toHaveBeenCalledWith({ userId: OWNER_SUB, ...newCard });
    const written = JSON.stringify(cardModel.create.mock.calls[0][0]);
    expect(written).not.toContain("4111111111114582");
    expect(written).not.toContain("cvv");
  });

  it("counts the limit per type, scoped to the caller", async () => {
    signIn();
    await POST(jsonRequest("POST", newCard));
    expect(cardModel.countDocuments).toHaveBeenCalledWith({ userId: OWNER_SUB, type: "credit" });
  });

  it("refuses a sixth card of the same type with 409 and writes nothing", async () => {
    signIn();
    cardModel.countDocuments.mockResolvedValue(5);

    const res = await POST(jsonRequest("POST", newCard));

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("CARD_LIMIT_REACHED");
    expect(cardModel.create).not.toHaveBeenCalled();
  });

  it("rolls back a card that a concurrent create pushed over the limit", async () => {
    signIn();
    cardModel.countDocuments.mockResolvedValueOnce(4).mockResolvedValueOnce(6);

    const res = await POST(jsonRequest("POST", newCard));

    expect(res.status).toBe(409);
    expect(cardModel.deleteOne).toHaveBeenCalledWith({ _id: CARD_ID, userId: OWNER_SUB });
  });

  it("rejects invalid last four digits with 400", async () => {
    signIn();
    const res = await POST(jsonRequest("POST", { ...newCard, last4: "12" }));
    expect(res.status).toBe(400);
    expect(cardModel.create).not.toHaveBeenCalled();
  });
});

describe("PUT /api/cards", () => {
  it("NO IDOR — another user's card id yields 404", async () => {
    signIn();
    cardModel.findOne.mockReturnValue({ lean: vi.fn(async () => null) });

    const res = await PUT(jsonRequest("PUT", { ...newCard, id: CARD_ID }));

    expect(res.status).toBe(404);
    expect(cardModel.findOne).toHaveBeenCalledWith({ _id: CARD_ID, userId: OWNER_SUB });
    expect(cardModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses to move a card into a type that is already full", async () => {
    signIn();
    cardModel.findOne.mockReturnValue({ lean: vi.fn(async () => ({ type: "debit" })) });
    cardModel.countDocuments.mockResolvedValue(5);

    const res = await PUT(jsonRequest("PUT", { ...newCard, id: CARD_ID }));

    expect(res.status).toBe(409);
    expect(cardModel.countDocuments).toHaveBeenCalledWith({ userId: OWNER_SUB, type: "credit", _id: { $ne: CARD_ID } });
    expect(cardModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("renames a card without re-checking the limit when the type is unchanged", async () => {
    signIn();
    cardModel.findOne.mockReturnValue({ lean: vi.fn(async () => ({ type: "credit" })) });
    cardModel.findOneAndUpdate.mockResolvedValue({ ...storedCard, name: "Amex" });

    const res = await PUT(jsonRequest("PUT", { ...newCard, name: "Amex", id: CARD_ID }));

    expect(res.status).toBe(200);
    expect(cardModel.countDocuments).not.toHaveBeenCalled();
    expect(cardModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: CARD_ID, userId: OWNER_SUB }, { type: "credit", name: "Amex", last4: "4582" }, { new: true });
  });
});

describe("DELETE /api/cards", () => {
  it("deletes only the caller's card and detaches it from the caller's expenses", async () => {
    signIn();
    cardModel.findOneAndDelete.mockResolvedValue(storedCard);

    const res = await DELETE(jsonRequest("DELETE", { id: CARD_ID }));

    expect(res.status).toBe(200);
    expect(cardModel.findOneAndDelete).toHaveBeenCalledWith({ _id: CARD_ID, userId: OWNER_SUB });
    expect(expenseModel.updateMany).toHaveBeenCalledWith(
      { userId: { $in: [OWNER_SUB, OWNER_EMAIL] }, cardId: CARD_ID },
      { $set: { cardId: null } }
    );
  });

  it("returns 404 and touches no expenses for someone else's card", async () => {
    signIn();
    cardModel.findOneAndDelete.mockResolvedValue(null);

    const res = await DELETE(jsonRequest("DELETE", { id: CARD_ID }));

    expect(res.status).toBe(404);
    expect(expenseModel.updateMany).not.toHaveBeenCalled();
  });
});
