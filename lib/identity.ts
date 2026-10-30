import User from "@/models/User";
import Expense from "@/models/Expense";
import { connectDB } from "@/lib/mongodb";

type GoogleIdentity = { sub: string; email: string; email_verified: boolean; name: string; picture?: string };

/** Never link different subjects by email, even when that email is verified. */
export async function persistVerifiedIdentity(profile: GoogleIdentity) {
  if (!profile.email_verified || !profile.sub || !profile.email) throw new Error("A verified Google identity is required.");
  await connectDB();
  const email = profile.email.toLowerCase();
  const existing = await User.findOne({ googleId: profile.sub }).lean();
  if (!existing && await User.exists({ email })) throw new Error("This account requires identity recovery before sign-in.");
  if (existing) {
    // Only an existing immutable binding may claim historical email-owned rows.
    const legacyEmail = existing.legacyExpenseEmail === undefined ? existing.email : existing.legacyExpenseEmail;
    if (legacyEmail) await Expense.updateMany({ userId: legacyEmail }, { $set: { userId: profile.sub } });
  }
  const update = {
    $set: { email, name: profile.name, image: profile.picture ?? null, legacyExpenseEmail: null },
    $setOnInsert: { googleId: profile.sub, preferredCurrency: "₹", emailVerified: new Date() },
  };
  try {
    await User.findOneAndUpdate({ googleId: profile.sub }, update, { upsert: true, new: true });
  } catch (error) {
    // Concurrent logins may insert the same subject; never retry by email.
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== 11000) throw error;
    const retry = await User.findOneAndUpdate({ googleId: profile.sub, email }, { $set: update.$set }, { new: true });
    if (!retry) throw new Error("Identity binding conflict.");
  }
}

export async function trustedLegacyExpenseEmail(subject: string): Promise<string | undefined> {
  if (!subject) return undefined;
  await connectDB();
  const user = await User.findOne({ googleId: subject }).select("email legacyExpenseEmail").lean();
  if (!user) return undefined;
  return (user.legacyExpenseEmail === undefined ? user.email : user.legacyExpenseEmail) || undefined;
}
