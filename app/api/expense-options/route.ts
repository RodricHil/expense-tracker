import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ownerId } from "@/lib/expenses";
import ExpenseOption from "@/models/ExpenseOption";
import { optionSchema, categoryUpdateSchema, optionDeleteSchema, parseJsonBody, unauthorized, handleRouteError, notFound } from "@/lib/validation";
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();
    await connectDB();
    const options = await ExpenseOption.find({ userId: ownerId(session) }).select("_id kind name archived legacyType").sort({ name: 1 }).lean();
    return Response.json({ options });
  } catch (error) { return handleRouteError(error); }
}
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();
    const { kind, name } = optionSchema.parse(await parseJsonBody(req));
    await connectDB();
    const option = await ExpenseOption.findOneAndUpdate({ userId: ownerId(session), kind, name }, { $set: { archived: false }, $setOnInsert: { name } }, { upsert: true, new: true, runValidators: true });
    return Response.json({ option: { _id: option._id, kind: option.kind, name: option.name, archived: option.archived, legacyType: option.legacyType } });
  } catch (error) { return handleRouteError(error); }
}


export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();
    const { id, name, kind } = categoryUpdateSchema.parse(await parseJsonBody(req));
    await connectDB();
    const option = await ExpenseOption.findOneAndUpdate(
      { _id: id, userId: ownerId(session), kind, archived: { $ne: true } },
      { $set: { name } }, { new: true, runValidators: true }
    );
    if (!option) return notFound();
    return Response.json({ option: { _id: option._id, kind: option.kind, name: option.name, archived: option.archived, legacyType: option.legacyType } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: "An option with this name already exists." }, { status: 409 });
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return unauthorized();
    const { id, kind } = optionDeleteSchema.parse(await parseJsonBody(req));
    await connectDB();
    // Keep the label for past expenses; remove it from future choices.
    const option = await ExpenseOption.findOneAndUpdate(
      { _id: id, userId: ownerId(session), kind },
      { $set: { archived: true } }, { new: true, runValidators: true }
    );
    if (!option) return notFound();
    return Response.json({ option: { _id: option._id, kind: option.kind, name: option.name, archived: true, legacyType: option.legacyType } });
  } catch (error) { return handleRouteError(error); }
}
