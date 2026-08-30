import mongoose from "mongoose";

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

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

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
