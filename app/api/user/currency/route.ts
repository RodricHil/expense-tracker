import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_CURRENCY, getPreferredCurrency } from "@/lib/preferences";
import {
  currencyUpdateSchema,
  handleRouteError,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/validation";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized();
    }

    const currency = await getPreferredCurrency(session.user.email);

    if (!currency) {
      return notFound();
    }

    return Response.json({ currency });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized();
    }

    const { currency } = currencyUpdateSchema.parse(await parseJsonBody(req));

    await connectDB();
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { preferredCurrency: currency },
      { new: true }
    ).lean();

    if (!user) {
      return notFound();
    }

    return Response.json({
      currency: user.preferredCurrency || DEFAULT_CURRENCY,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
