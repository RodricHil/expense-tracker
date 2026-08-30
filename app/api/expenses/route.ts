import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import mongoose from "mongoose";
import {
  expenseCreateSchema,
  expenseDeleteSchema,
  expenseUpdateSchema,
  handleRouteError,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    // Validate before touching the database. Unknown keys (_id, createdAt,
    // updatedAt, userId, ...) are dropped by the schema, and the fields below
    // are destructured explicitly — the request body is never spread.
    const { date, description, quantity, mode, type, amount } =
      expenseCreateSchema.parse(await parseJsonBody(req));

    await connectDB();

    const expense = await Expense.create({
      userId: session.user.email,
      date,
      description,
      quantity: quantity ?? null,
      mode,
      type,
      amount: mongoose.Types.Decimal128.fromString(amount),
    });

    return Response.json({
      ...expense.toObject(),
      amount: parseFloat(expense.amount.toString()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    await connectDB();

    const expenses = await Expense.find({
      userId: session.user.email,
    })
      .sort({ date: -1 })
      .lean();

    const formatted = expenses.map((exp: any) => ({
      ...exp,
      amount: parseFloat(exp.amount.toString()),
    }));

    return Response.json(formatted);
  } catch (error) {
    return handleRouteError(error);
  }
}


export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorized();
    }

    // `id` is validated as a real ObjectId string, so a query operator such as
    // {"$ne": null} is rejected with a 400 before it reaches the filter.
    const { id } = expenseDeleteSchema.parse(await parseJsonBody(req));

    await connectDB();

    const expense = await Expense.findOneAndDelete({
      _id: id,
      userId: session.user.email, // extra security
    });

    if (!expense) {
      return notFound();
    }

    return Response.json({ message: "Deleted successfully" });
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

    const { id, date, description, quantity, mode, type, amount } =
      expenseUpdateSchema.parse(await parseJsonBody(req));

    await connectDB();

    const updatedExpense = await Expense.findOneAndUpdate(
      {
        _id: id,
        userId: session.user.email, // secure
      },
      {
        date,
        description,
        quantity: quantity ?? null,
        mode,
        type,
        amount: mongoose.Types.Decimal128.fromString(amount),
      },
      { new: true }
    );

    if (!updatedExpense) {
      return notFound();
    }

    return Response.json({
      ...updatedExpense.toObject(),
      amount: parseFloat(updatedExpense.amount.toString()),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
