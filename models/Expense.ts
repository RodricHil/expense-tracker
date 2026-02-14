import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      default: null,
      min: 0,
    },

    mode: {
      type: String,
      required: true,
      enum: ["online", "cash"],
    },

    type: {
      type: String,
      required: true,
      enum: [
        "food",
        "electronics",
        "dress",
        "service",
        "gardening",
        "furniture",
        "house utility",
        "footwear",
        "makeup/grooming",
        "subscriptions",
        "toy/figures/stationary",
        "travel expenses",
        "gifts",
        "medicines",
        "harmful item",
        "investment",
        "bills",
        "repair",
        "vehicle expenses",
        "decoration",
        "others",
      ],
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);
