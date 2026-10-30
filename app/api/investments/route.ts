import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Investment from "@/models/Investment";
import { investmentSchema, investmentUpdateSchema, investmentDeleteSchema, investmentQuerySchema, EMPTY_INVESTMENT_SUMMARY } from "@/lib/investments";
import { parseJsonBody, handleRouteError, unauthorized, notFound } from "@/lib/validation";
const PRIVATE = { "Cache-Control": "private, no-store" };
const fields = "name type status currency investedCents currentValueCents contributionCents frequency startDate maturityDate";
const insurance = { $in: ["$type", ["health-insurance", "life-insurance"]] };
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();
    const query = investmentQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = { userId: session.user.id, currency: query.currency, ...(query.type ? { type: query.type } : {}), ...(query.status ? { status: query.status } : {}), ...(escaped ? { name: { $regex: escaped, $options: "i" } } : {}) };
    await connectDB();
    const [aggregate] = await Investment.aggregate([
      { $match: filter },
      { $facet: {
        count: [{ $count: "total" }],
        summary: [{ $group: { _id: null,
          investedCents: { $sum: { $cond: [insurance, 0, "$investedCents"] } },
          premiumsCents: { $sum: { $cond: [insurance, "$investedCents", 0] } },
          currentValueCents: { $sum: { $cond: [insurance, 0, { $ifNull: ["$currentValueCents", 0] }] } },
          valuedInvestedCents: { $sum: { $cond: [{ $and: [{ $not: [insurance] }, { $ne: ["$currentValueCents", null] }] }, "$investedCents", 0] } },
          valuedCount: { $sum: { $cond: [{ $and: [{ $not: [insurance] }, { $ne: ["$currentValueCents", null] }] }, 1, 0] } },
          investmentCount: { $sum: { $cond: [insurance, 0, 1] } }, insuranceCount: { $sum: { $cond: [insurance, 1, 0] } },
        } }],
      } },
    ]);
    const total = aggregate?.count?.[0]?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / 20));
    const page = Math.min(query.page, pages);
    const rows = await Investment.find(filter).select(fields).sort({ startDate: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean();
    const summary = { ...EMPTY_INVESTMENT_SUMMARY };
    for (const key of Object.keys(summary) as (keyof typeof summary)[]) summary[key] = aggregate?.summary?.[0]?.[key] ?? 0;
    return Response.json({ currency: query.currency, records: rows.map(({ _id, ...row }) => ({ ...row, id: String(_id) })), total, page, pages, summary }, { headers: PRIVATE });
  } catch (error) { return handleRouteError(error); }
}
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();
    const record = investmentSchema.parse(await parseJsonBody(req));
    await connectDB();
    await Investment.create({ ...record, userId: session.user.id });
    return Response.json({ message: "Investment added" }, { status: 201, headers: PRIVATE });
  } catch (error) { return handleRouteError(error); }
}
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();
    const { id, record } = investmentUpdateSchema.parse(await parseJsonBody(req));
    await connectDB();
    const updated = await Investment.findOneAndUpdate({ _id: id, userId: session.user.id, currency: record.currency }, { $set: record }, { new: true, runValidators: true });
    if (!updated) return notFound();
    return Response.json({ message: "Investment updated" }, { headers: PRIVATE });
  } catch (error) { return handleRouteError(error); }
}
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();
    const { id } = investmentDeleteSchema.parse(await parseJsonBody(req));
    await connectDB();
    if (!await Investment.findOneAndDelete({ _id: id, userId: session.user.id })) return notFound();
    return Response.json({ message: "Investment deleted" }, { headers: PRIVATE });
  } catch (error) { return handleRouteError(error); }
}
