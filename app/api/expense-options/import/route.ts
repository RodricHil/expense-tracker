import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ownerFilter, ownerId } from "@/lib/expenses";
import { categories } from "@/lib/expense-options";
import Expense from "@/models/Expense";
import ExpenseOption from "@/models/ExpenseOption";
import { handleRouteError, unauthorized } from "@/lib/validation";

/** Restore the old list only for accounts that used it. Never rewrite expenses. */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();
    await connectDB();
    const userId = ownerId(session);
    const legacyFilter = { userId, kind: "category", legacyType: { $in: categories } };
    if (await ExpenseOption.countDocuments(legacyFilter) === categories.length) return Response.json({ imported: false });
    if (!await Expense.exists({ ...ownerFilter(session), type: { $in: categories } })) return Response.json({ imported: false });
    // The legacy key is stable across renames and deletion. Repeated imports
    // therefore neither duplicate categories nor resurrect deleted choices.
    for (const type of categories) {
      const existing = await ExpenseOption.findOne({ userId, kind: "category", legacyType: type });
      if (existing) continue;
      // Reuse a matching personal category rather than creating a duplicate.
      await ExpenseOption.findOneAndUpdate(
        { userId, kind: "category", name: type },
        { $set: { legacyType: type }, $setOnInsert: { name: type } },
        { upsert: true, new: true, runValidators: true }
      );
    }
    return Response.json({ imported: true });
  } catch (error) { return handleRouteError(error); }
}
