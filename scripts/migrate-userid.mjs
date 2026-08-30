#!/usr/bin/env node
/**
 * ET-M1 — one-off migration: re-key `Expense.userId` from the mutable email
 * address to the immutable Google `sub` stored on `User.googleId`.
 *
 * Context
 * -------
 * Expenses used to be owned by `userId: session.user.email`. New expenses are
 * now written with the stable Google subject id, and the API reads with a
 * transitional `userId: { $in: [stableId, email] }` filter so nothing was ever
 * unreachable in between. This script closes that transition by rewriting the
 * historical rows; once it has run and been verified, the `$in` in
 * `app/api/expenses/route.ts` can be reduced to a single-key match.
 *
 * Safety properties
 * -----------------
 *   * DRY RUN BY DEFAULT. Nothing is written unless `--apply` is passed.
 *   * IDEMPOTENT. It only ever touches rows whose `userId` is an email that
 *     maps to a known `googleId`; a second run finds nothing to do.
 *   * NON-DESTRUCTIVE ON AMBIGUITY. A row whose email has no matching user, or
 *     a user with no `googleId` yet (they have not signed in since the field
 *     was added), is reported as UNMAPPED and left exactly as it is.
 *   * It prints owner-key counts before and after so the two can be compared.
 *
 * Usage
 * -----
 *   # 1. Take a backup first. On Atlas: Clusters -> ... -> Take Snapshot.
 *   # 2. Dry run — reports what would change, writes nothing:
 *   node --env-file=.env.local scripts/migrate-userid.mjs
 *
 *   # 3. Only once the dry run reports 0 unmapped rows:
 *   node --env-file=.env.local scripts/migrate-userid.mjs --apply
 *
 *   # 4. Re-run the dry run: it must now report 0 legacy rows.
 *
 * MONGODB_URI may also be exported in the environment instead of using
 * --env-file. Point it at a restored copy of production the first time.
 */

import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const MONGODB_URI = process.env.MONGODB_URI;

/** An email is the only legacy shape; a Google `sub` is a digit string. */
const EMAIL_RE = /@/;

function log(...args) {
  console.log(...args);
}

function summarise(label, counts) {
  log(`\n${label}`);
  log(`  total expenses            : ${counts.total}`);
  log(`  owned by a stable id      : ${counts.stable}`);
  log(`  owned by a legacy email   : ${counts.legacy}`);
}

async function countOwners(expenses) {
  const total = await expenses.countDocuments({});
  const legacy = await expenses.countDocuments({ userId: EMAIL_RE });

  return { total, legacy, stable: total - legacy };
}

async function main() {
  if (!MONGODB_URI) {
    console.error(
      "MONGODB_URI is not set. Pass it with `node --env-file=.env.local ...` " +
        "or export it in the environment."
    );
    process.exitCode = 1;
    return;
  }

  log(
    APPLY
      ? "MODE: APPLY — changes WILL be written."
      : "MODE: DRY RUN — no changes will be written. Pass --apply to write."
  );

  await mongoose.connect(MONGODB_URI);

  try {
    const db = mongoose.connection.db;
    const expenses = db.collection("expenses");
    const users = db.collection("users");

    const before = await countOwners(expenses);
    summarise("BEFORE", before);

    if (before.legacy === 0) {
      log("\nNothing to migrate — no expense is owned by an email address.");
      return;
    }

    // Distinct legacy owner keys, i.e. the set of emails still in use.
    const legacyOwners = (await expenses.distinct("userId", { userId: EMAIL_RE }))
      .filter((value) => typeof value === "string")
      .sort();

    log(`\nDistinct legacy owner keys: ${legacyOwners.length}`);

    let migrated = 0;
    let unmapped = 0;

    for (const email of legacyOwners) {
      const rows = await expenses.countDocuments({ userId: email });
      const user = await users.findOne(
        { email: email.toLowerCase() },
        { projection: { googleId: 1 } }
      );
      const googleId = user?.googleId;

      if (!googleId) {
        unmapped += rows;
        log(
          `  UNMAPPED  ${rows} row(s) — no user with a googleId for this ` +
            `address; left untouched. The owner must sign in once so the ` +
            `googleId is recorded, then re-run.`
        );
        continue;
      }

      if (APPLY) {
        const result = await expenses.updateMany(
          { userId: email },
          { $set: { userId: googleId } }
        );
        migrated += result.modifiedCount;
        log(`  MIGRATED  ${result.modifiedCount} row(s) -> ${googleId}`);
      } else {
        migrated += rows;
        log(`  WOULD MIGRATE  ${rows} row(s) -> ${googleId}`);
      }
    }

    const after = await countOwners(expenses);
    summarise(APPLY ? "AFTER" : "AFTER (unchanged — dry run)", after);

    log(`\n  rows ${APPLY ? "migrated" : "that would migrate"} : ${migrated}`);
    log(`  rows unmapped (left as-is)  : ${unmapped}`);

    if (after.total !== before.total) {
      console.error(
        "\nFATAL: the expense count changed during the run. Investigate before " +
          "proceeding; this migration must never add or remove documents."
      );
      process.exitCode = 1;
      return;
    }

    if (unmapped > 0) {
      log(
        "\nNOT DONE: some rows are unmapped. Do NOT remove the transitional " +
          "`$in` owner filter in app/api/expenses/route.ts yet."
      );
      process.exitCode = 1;
      return;
    }

    if (APPLY && after.legacy === 0) {
      log(
        "\nDONE: every expense is now owned by a stable id. The transitional " +
          "`$in` filter in app/api/expenses/route.ts may now be reduced to a " +
          "single-key match."
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("\nMigration failed:", error);
  process.exitCode = 1;
});
