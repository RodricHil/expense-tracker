import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import mongoose from "mongoose";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();
  const body = await req.json();

  const expense = await Expense.create({
    ...body,
    userId: session.user?.email,
    amount: mongoose.Types.Decimal128.fromString(
      body.amount.toString()
    ),
  });

  return Response.json({
    ...expense.toObject(),
    amount: parseFloat(expense.amount.toString()),
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  const expenses = await Expense.find({
    userId: session.user?.email,
  })
    .sort({ date: -1 })
    .lean();

  const formatted = expenses.map((exp: any) => ({
    ...exp,
    amount: parseFloat(exp.amount.toString()),
  }));

  return Response.json(formatted);
}


export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  const { id } = await req.json();

  const expense = await Expense.findOneAndDelete({
    _id: id,
    userId: session.user?.email, // extra security
  });

  if (!expense) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json({ message: "Deleted successfully" });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();
  const body = await req.json();

  const updatedExpense = await Expense.findOneAndUpdate(
    {
      _id: body.id,
      userId: session.user?.email, // secure
    },
    {
      date: body.date,
      description: body.description,
      quantity: body.quantity,
      mode: body.mode,
      type: body.type,
      amount: mongoose.Types.Decimal128.fromString(
        body.amount.toString()
      ),
    },
    { new: true }
  );

  if (!updatedExpense) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json({
    ...updatedExpense.toObject(),
    amount: parseFloat(updatedExpense.amount.toString()),
  });
}
