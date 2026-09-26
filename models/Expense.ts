import mongoose from "mongoose";
import { PAYMENT_METHODS } from "@/lib/payment";

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
      enum: PAYMENT_METHODS,
    },

    /**
     * The saved card used when `mode` is "card". Only the card's id is stored;
     * its nickname and last four digits live on the Card document. Null for
     * online/cash payments, or when the card has since been deleted.
     */
    cardId: {
      type: String,
      default: null,
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
