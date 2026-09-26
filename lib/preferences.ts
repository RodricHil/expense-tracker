import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const DEFAULT_CURRENCY = "₹";

/**
 * The signed-in user's display currency, or null when no user record exists.
 * Read by `/api/user/currency` and by the root layout, which seeds it into the
 * client so amounts never render in the wrong currency first.
 */
export async function getPreferredCurrency(email: string): Promise<string | null> {
  await connectDB();
  const user = await User.findOne({ email }).lean<{ preferredCurrency?: string }>();
  if (!user) return null;
  return user.preferredCurrency || DEFAULT_CURRENCY;
}
