import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ET-H2 / §E positive control — OWNERSHIP SCOPING ON ALL FOUR EXPENSE VERBS.
 *
 * "No IDOR — ownership enforced server-side on every operation" is the single
 * most important thing this application gets right, and until now nothing
 * defended it. These tests are the regression gate: they assert that every verb
 * puts the owner key INSIDE the database filter (not in a check performed after
 * the document has been fetched), and that a forged or borrowed `_id` therefore
 * comes back as a 404, never as somebody else's record.
 *
 * Everything below the route handler is mocked, so the suite needs no MongoDB,
 * no NextAuth secret and no network.
 */

const getServerSession = vi.fn();
const connectDB = vi.fn(async () => undefined);

type QueryChain = {
  sort: ReturnType<typeof vi.fn>;
  skip: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  lean: ReturnType<typeof vi.fn>;
};

/** A stand-in for the chainable Mongoose query builder `find()` returns. */
function queryChain(rows: unknown[]): QueryChain {
  const chain: QueryChain = {
    sort: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    lean: vi.fn(async () => rows),
  };
  return chain;
}

const expenseModel = {
  find: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
};

vi.mock("next-auth", () => ({
  default: vi.fn(() => vi.fn()),
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", name: "Google", type: "oauth" })),
}));

vi.mock("@/lib/mongodb", () => ({ connectDB: () => connectDB() }));
vi.mock("@/models/Expense", () => ({ default: expenseModel }));
vi.mock("@/models/User", () => ({ default: { findOneAndUpdate: vi.fn() } }));
const cardModel = { exists: vi.fn() };
vi.mock("@/models/Card", () => ({ default: cardModel }));

const { DELETE, GET, POST, PUT } = await import("@/app/api/expenses/route");

/** The stable Google `sub` (ET-M1) and the legacy email key for the same user. */
const OWNER_SUB = "108000000000000000001";
const OWNER_EMAIL = "owner@example.test";

/** A different, real user — used to prove one session cannot read another's rows. */
const OTHER_SUB = "108000000000000000002";
const OTHER_EMAIL = "other@example.test";

const VICTIM_EXPENSE_ID = "507f1f77bcf86cd799439011";

function signIn(id = OWNER_SUB, email = OWNER_EMAIL) {
  getServerSession.mockResolvedValue({ user: { id, email, name: "Owner" } });
}

/** The filter every verb is expected to scope by (Round 5 transitional `$in`). */
function ownerFilter(id = OWNER_SUB, email = OWNER_EMAIL) {
  return { userId: { $in: [id, email] } };
}

function emptyFacets() {
  return [
    {
      allTime: [{ _id: null, amount: 0 }],
      rangeTotal: [],
      byType: [],
      byMode: [],
      byDay: [],
    },
  ];
}

function jsonRequest(method: string, body: unknown) {
  return new Request("https://example.test/api/expenses", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  date: "2026-08-01T00:00:00.000Z",
  description: "Groceries",
  quantity: 1,
  mode: "cash",
  type: "food",
  amount: "42.50",
};

beforeEach(() => {
  vi.clearAllMocks();
  connectDB.mockResolvedValue(undefined);
  expenseModel.find.mockReturnValue(queryChain([]));
  expenseModel.aggregate.mockResolvedValue(emptyFacets());
});

describe("GET /api/expenses — ownership", () => {
  it("returns 401 without a session and never touches the database", async () => {
    getServerSession.mockResolvedValue(null);

    const res = await GET(new Request("https://example.test/api/expenses"));

    expect(res.status).toBe(401);
    expect(expenseModel.find).not.toHaveBeenCalled();
    expect(connectDB).not.toHaveBeenCalled();
  });

  it("scopes the row query AND the aggregation to the signed-in owner", async () => {
    signIn();

    await GET(new Request("https://example.test/api/expenses"));

    expect(expenseModel.find).toHaveBeenCalledWith(
      expect.objectContaining(ownerFilter())
    );

    const pipeline = expenseModel.aggregate.mock.calls[0][0];
    // The ownership match must be the FIRST stage, so every `$facet`
    // sub-pipeline inherits it and none can widen the scope.
    expect(pipeline[0]).toEqual({ $match: ownerFilter() });
  });

  it("uses a different filter for a different session — no cross-user read", async () => {
    signIn(OTHER_SUB, OTHER_EMAIL);

    await GET(new Request("https://example.test/api/expenses"));

    const filter = expenseModel.find.mock.calls[0][0];
    expect(filter).toEqual(expect.objectContaining(ownerFilter(OTHER_SUB, OTHER_EMAIL)));
    expect(JSON.stringify(filter)).not.toContain(OWNER_SUB);
    expect(JSON.stringify(filter)).not.toContain(OWNER_EMAIL);
  });

  it("cannot be tricked into a different owner via a query parameter", async () => {
    signIn();

    await GET(
      new Request(
        `https://example.test/api/expenses?userId=${OTHER_EMAIL}&user=${OTHER_SUB}`
      )
    );

    expect(expenseModel.find).toHaveBeenCalledWith(
      expect.objectContaining(ownerFilter())
    );
    expect(JSON.stringify(expenseModel.find.mock.calls[0][0])).not.toContain(
      OTHER_EMAIL
    );
  });
});

describe("GET /api/expenses — §G.4 pagination and date filtering", () => {
  it("defaults to page 1 with the default page size", async () => {
    signIn();
    const chain = queryChain([]);
    expenseModel.find.mockReturnValue(chain);

    await GET(new Request("https://example.test/api/expenses"));

    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it("translates page/limit into skip/limit", async () => {
    signIn();
    const chain = queryChain([]);
    expenseModel.find.mockReturnValue(chain);

    await GET(new Request("https://example.test/api/expenses?page=3&limit=50"));

    expect(chain.skip).toHaveBeenCalledWith(100);
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it("rejects a limit above the cap with a 400 and issues no query", async () => {
    signIn();

    const res = await GET(
      new Request("https://example.test/api/expenses?limit=1000000")
    );

    expect(res.status).toBe(400);
    expect(expenseModel.find).not.toHaveBeenCalled();
  });

  it("rejects an unparseable date range with a 400", async () => {
    signIn();

    const res = await GET(
      new Request("https://example.test/api/expenses?from=not-a-date")
    );

    expect(res.status).toBe(400);
    expect(expenseModel.find).not.toHaveBeenCalled();
  });

  it("applies from/to as a $gte/$lte date filter alongside the owner filter", async () => {
    signIn();

    await GET(
      new Request(
        "https://example.test/api/expenses?from=2026-08-01T00:00:00.000Z&to=2026-08-31T23:59:59.999Z"
      )
    );

    const filter = expenseModel.find.mock.calls[0][0];
    expect(filter.userId).toEqual(ownerFilter().userId);
    expect(filter.date.$gte.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(filter.date.$lte.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("returns the paginated envelope with server-computed totals", async () => {
    signIn();
    expenseModel.find.mockReturnValue(
      queryChain([
        {
          _id: VICTIM_EXPENSE_ID,
          description: "Groceries",
          type: "food",
          mode: "cash",
          amount: { toString: () => "42.50" },
        },
      ])
    );
    expenseModel.aggregate.mockResolvedValue([
      {
        allTime: [{ _id: null, amount: 999.994 }],
        rangeTotal: [{ _id: null, amount: 42.5, count: 137 }],
        byType: [{ _id: "food", amount: 42.5 }],
        byMode: [{ _id: "cash", amount: 42.5 }],
        byDay: [{ _id: "2026-08-01", amount: 42.5 }],
      },
    ]);

    const res = await GET(
      new Request("https://example.test/api/expenses?page=2&limit=20")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expenses).toHaveLength(1);
    // Decimal128 still arrives as a JSON number, exactly as before §G.4.
    expect(body.expenses[0].amount).toBe(42.5);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 137,
      totalPages: 7,
      hasMore: true,
    });
    expect(body.summary.rangeTotal).toBe(42.5);
    expect(body.summary.allTimeTotal).toBe(999.99);
    expect(body.summary.byType).toEqual([{ type: "food", amount: 42.5 }]);
    expect(body.summary.byDay).toEqual([{ date: "2026-08-01", amount: 42.5 }]);
  });

  it("keeps the response bounded: never more rows than the page size", async () => {
    signIn();
    const chain = queryChain([]);
    expenseModel.find.mockReturnValue(chain);

    await GET(new Request("https://example.test/api/expenses?limit=100"));

    expect(chain.limit).toHaveBeenCalledWith(100);
    // 100 is the documented ceiling; anything above it is a 400 (tested above),
    // so no request can produce an unbounded response.
  });
});

describe("POST /api/expenses — ownership", () => {
  it("returns 401 without a session", async () => {
    getServerSession.mockResolvedValue(null);

    const res = await POST(jsonRequest("POST", validBody));

    expect(res.status).toBe(401);
    expect(expenseModel.create).not.toHaveBeenCalled();
  });

  it("ET-M1 — writes the immutable Google sub as the owner key", async () => {
    signIn();
    expenseModel.create.mockResolvedValue({
      toObject: () => ({ _id: VICTIM_EXPENSE_ID }),
      amount: { toString: () => "42.50" },
    });

    await POST(jsonRequest("POST", validBody));

    expect(expenseModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: OWNER_SUB })
    );
  });

  it("ET-H5 — ignores a userId supplied in the body", async () => {
    signIn();
    expenseModel.create.mockResolvedValue({
      toObject: () => ({ _id: VICTIM_EXPENSE_ID }),
      amount: { toString: () => "42.50" },
    });

    await POST(
      jsonRequest("POST", {
        ...validBody,
        userId: OTHER_EMAIL,
        _id: VICTIM_EXPENSE_ID,
      })
    );

    const written = expenseModel.create.mock.calls[0][0];
    expect(written.userId).toBe(OWNER_SUB);
    expect(written).not.toHaveProperty("_id");
  });

  it("returns 400 and writes nothing when the body fails validation", async () => {
    signIn();

    const res = await POST(
      jsonRequest("POST", { ...validBody, amount: "not-a-number" })
    );

    expect(res.status).toBe(400);
    expect(expenseModel.create).not.toHaveBeenCalled();
  });
});

describe("PUT /api/expenses — ownership", () => {
  it("returns 401 without a session", async () => {
    getServerSession.mockResolvedValue(null);

    const res = await PUT(jsonRequest("PUT", { ...validBody, id: VICTIM_EXPENSE_ID }));

    expect(res.status).toBe(401);
    expect(expenseModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("puts the owner key inside the update filter, next to the _id", async () => {
    signIn();
    expenseModel.findOneAndUpdate.mockResolvedValue({
      toObject: () => ({ _id: VICTIM_EXPENSE_ID }),
      amount: { toString: () => "42.50" },
    });

    await PUT(jsonRequest("PUT", { ...validBody, id: VICTIM_EXPENSE_ID }));

    expect(expenseModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: VICTIM_EXPENSE_ID, ...ownerFilter() },
      expect.any(Object),
      expect.objectContaining({ new: true })
    );
  });

  it("NO IDOR — another user's _id yields 404, never their record", async () => {
    signIn(OTHER_SUB, OTHER_EMAIL);
    // The ownership clause in the filter means Mongo matches nothing.
    expenseModel.findOneAndUpdate.mockResolvedValue(null);

    const res = await PUT(jsonRequest("PUT", { ...validBody, id: VICTIM_EXPENSE_ID }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not Found" });
    expect(expenseModel.findOneAndUpdate.mock.calls[0][0]).toEqual({
      _id: VICTIM_EXPENSE_ID,
      ...ownerFilter(OTHER_SUB, OTHER_EMAIL),
    });
  });

  it("ET-H5 — a userId in the body cannot re-key the record", async () => {
    signIn();
    expenseModel.findOneAndUpdate.mockResolvedValue({
      toObject: () => ({ _id: VICTIM_EXPENSE_ID }),
      amount: { toString: () => "42.50" },
    });

    await PUT(
      jsonRequest("PUT", {
        ...validBody,
        id: VICTIM_EXPENSE_ID,
        userId: OTHER_EMAIL,
      })
    );

    const update = expenseModel.findOneAndUpdate.mock.calls[0][1];
    expect(update).not.toHaveProperty("userId");
    expect(update).not.toHaveProperty("_id");
  });

  it("ET-M5 — an operator object as the id is a 400, not a query", async () => {
    signIn();

    const res = await PUT(
      jsonRequest("PUT", { ...validBody, id: { $ne: null } })
    );

    expect(res.status).toBe(400);
    expect(expenseModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/expenses — ownership", () => {
  it("returns 401 without a session", async () => {
    getServerSession.mockResolvedValue(null);

    const res = await DELETE(jsonRequest("DELETE", { id: VICTIM_EXPENSE_ID }));

    expect(res.status).toBe(401);
    expect(expenseModel.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("puts the owner key inside the delete filter, next to the _id", async () => {
    signIn();
    expenseModel.findOneAndDelete.mockResolvedValue({ _id: VICTIM_EXPENSE_ID });

    const res = await DELETE(jsonRequest("DELETE", { id: VICTIM_EXPENSE_ID }));

    expect(res.status).toBe(200);
    expect(expenseModel.findOneAndDelete).toHaveBeenCalledWith({
      _id: VICTIM_EXPENSE_ID,
      ...ownerFilter(),
    });
  });

  it("NO IDOR — another user's _id yields 404 and deletes nothing", async () => {
    signIn(OTHER_SUB, OTHER_EMAIL);
    expenseModel.findOneAndDelete.mockResolvedValue(null);

    const res = await DELETE(jsonRequest("DELETE", { id: VICTIM_EXPENSE_ID }));

    expect(res.status).toBe(404);
    expect(expenseModel.findOneAndDelete.mock.calls[0][0]).toEqual({
      _id: VICTIM_EXPENSE_ID,
      ...ownerFilter(OTHER_SUB, OTHER_EMAIL),
    });
  });

  it("ET-M5 — {\"$ne\": null} as the id is a 400, not a mass delete", async () => {
    signIn();

    const res = await DELETE(jsonRequest("DELETE", { id: { $ne: null } }));

    expect(res.status).toBe(400);
    expect(expenseModel.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("ET-H4 — a malformed JSON body is a 400, not an unhandled 500", async () => {
    signIn();

    const res = await DELETE(
      new Request("https://example.test/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      })
    );

    expect(res.status).toBe(400);
    expect(expenseModel.findOneAndDelete).not.toHaveBeenCalled();
  });
});

describe("error handling (ET-H4)", () => {
  it("turns an unexpected database failure into a generic 500 with no internals", async () => {
    signIn();
    expenseModel.find.mockImplementation(() => {
      throw new Error("connection to db.internal:27017 refused (user=svc_prod)");
    });

    const res = await GET(new Request("https://example.test/api/expenses"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal Server Error");
    expect(JSON.stringify(body)).not.toContain("db.internal");
    expect(JSON.stringify(body)).not.toContain("svc_prod");
    expect(typeof body.errorId).toBe("string");
  });
});

describe("card payments — saved card references", () => {
  const CARD_ID = "65a1b2c3d4e5f60718293a4b";

  it("stores the card id when it belongs to the caller", async () => {
    signIn();
    cardModel.exists.mockResolvedValue({ _id: CARD_ID });
    expenseModel.create.mockResolvedValue({ toObject: () => ({}), amount: "42.50" });

    const res = await POST(jsonRequest("POST", { ...validBody, mode: "card", cardId: CARD_ID }));

    expect(res.status).toBe(200);
    expect(cardModel.exists).toHaveBeenCalledWith({ _id: CARD_ID, userId: OWNER_SUB });
    expect(expenseModel.create).toHaveBeenCalledWith(expect.objectContaining({ mode: "card", cardId: CARD_ID }));
  });

  it("NO IDOR — refuses a card that belongs to somebody else", async () => {
    signIn();
    cardModel.exists.mockResolvedValue(null);

    const res = await POST(jsonRequest("POST", { ...validBody, mode: "card", cardId: CARD_ID }));

    expect(res.status).toBe(400);
    expect(expenseModel.create).not.toHaveBeenCalled();
  });

  it("drops a card id sent with a cash payment without looking it up", async () => {
    signIn();
    expenseModel.create.mockResolvedValue({ toObject: () => ({}), amount: "42.50" });

    await POST(jsonRequest("POST", { ...validBody, mode: "cash", cardId: CARD_ID }));

    expect(cardModel.exists).not.toHaveBeenCalled();
    expect(expenseModel.create).toHaveBeenCalledWith(expect.objectContaining({ mode: "cash", cardId: null }));
  });

  it("checks card ownership on update as well", async () => {
    signIn();
    cardModel.exists.mockResolvedValue(null);

    const res = await PUT(jsonRequest("PUT", { ...validBody, id: VICTIM_EXPENSE_ID, mode: "card", cardId: CARD_ID }));

    expect(res.status).toBe(400);
    expect(expenseModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("GET /api/expenses — payment filter", () => {
  const CARD_ID = "65a1b2c3d4e5f60718293a4b";

  it("narrows the rows and every range facet, but not the all-time total", async () => {
    signIn();

    await GET(new Request(`https://example.test/api/expenses?mode=card&cardId=${CARD_ID}`));

    expect(expenseModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ ...ownerFilter(), mode: "card", cardId: CARD_ID })
    );
    const pipeline = expenseModel.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({ $match: ownerFilter() });
    const facets = pipeline[1].$facet;
    for (const key of ["rangeTotal", "byType", "byMode", "byDay"]) {
      expect(facets[key][0].$match).toMatchObject({ mode: "card", cardId: CARD_ID });
    }
    expect(JSON.stringify(facets.allTime)).not.toContain("card");
  });

  it("applies a method-only filter without a card condition", async () => {
    signIn();

    await GET(new Request("https://example.test/api/expenses?mode=cash"));

    const filter = expenseModel.find.mock.calls[0][0];
    expect(filter.mode).toBe("cash");
    expect(filter).not.toHaveProperty("cardId");
  });

  it("rejects an invalid mode with a 400 and issues no query", async () => {
    signIn();

    const res = await GET(new Request("https://example.test/api/expenses?mode=crypto"));

    expect(res.status).toBe(400);
    expect(expenseModel.find).not.toHaveBeenCalled();
  });

  it("refuses a card payment with no card", async () => {
    signIn();

    const res = await POST(jsonRequest("POST", { ...validBody, mode: "card" }));

    expect(res.status).toBe(400);
    expect(expenseModel.create).not.toHaveBeenCalled();
  });
});
