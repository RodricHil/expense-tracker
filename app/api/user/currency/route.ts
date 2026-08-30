import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  currencyUpdateSchema,
  handleRouteError,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/validation";

const DEFAULT_CURRENCY = "₹";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized();
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email }).lean();

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
