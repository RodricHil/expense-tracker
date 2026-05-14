import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const validCurrencies = ["₹", "$", "€", "£", "¥", "₺"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email }).lean();

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  return Response.json({ currency: user.preferredCurrency || "₹" });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const currency = body?.currency?.toString();

  if (!currency || !validCurrencies.includes(currency)) {
    return new Response("Invalid currency", { status: 400 });
  }

  await connectDB();
  const user = await User.findOneAndUpdate(
    { email: session.user.email },
    { preferredCurrency: currency },
    { new: true }
  ).lean();

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  return Response.json({ currency: user.preferredCurrency || "₹" });
}
