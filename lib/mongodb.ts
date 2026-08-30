import mongoose, { type Mongoose } from "mongoose";

/**
 * ET-M6: the MONGODB_URI guard lives INSIDE connectDB(), never at module
 * scope. Next.js evaluates every imported module during `next build` page-data
 * collection, so a module-scope `throw` made a database credential a *build*
 * requirement — it failed a clean checkout with "Failed to collect page data
 * for /api/user/currency". Nothing here throws on import any more: the
 * connection string is resolved and validated on first *use*, which is the
 * only moment it is actually needed.
 *
 * This is the prerequisite for CI (Round 7): the pipeline can build without
 * being handed a production connection string.
 */
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }

  return uri;
}

/**
 * ET-L5: the cache used to be `(global as any).mongoose`, two `no-explicit-any`
 * lint errors that also erased every type downstream — `connectDB()` returned
 * `any`, so nothing that consumed a connection was type-checked either.
 *
 * The cache is a module-scope singleton hung off `globalThis` on purpose: Next.js
 * re-evaluates route modules across hot reloads and serverless invocations, and a
 * plain module-level `let` would hand every reload a fresh (empty) cache and open
 * a new connection pool each time.
 */
type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

declare global {
  // `var` is required here: only `var` declarations merge into the `globalThis`
  // type. `let`/`const` in a `declare global` block are not visible on it.
  var __expenseTrackerMongoose: MongooseCache | undefined;
}

const cached: MongooseCache = (globalThis.__expenseTrackerMongoose ??= {
  conn: null,
  promise: null,
});

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // Resolved here, not at import time — see getMongoUri() above.
    cached.promise = mongoose.connect(getMongoUri());
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Do not cache a rejected promise: a transient failure (or a missing
    // MONGODB_URI that is later supplied) would otherwise poison every
    // subsequent call for the lifetime of the process.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
