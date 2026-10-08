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
     * The saved card used for direct card, online card, or RuPay UPI payments.
     * Its nickname and last four digits live on the Card document. Null for
     * cash/bank-funded UPI payments, or when the card has since been deleted.
     */
    cardId: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      required: true,
    },

    onlineMethod: { type: String, enum: ["card", "upi", null] },
    upiApp: { type: String, maxlength: 60 },
    upiSource: { type: String, enum: ["bank", "rupay-credit", null] },
    cardNetwork: { type: String, enum: ["visa", "mastercard", "rupay", null] },
    merchant: { type: String, maxlength: 120 },
    platform: { type: String, maxlength: 120 },
    refunds: { type: [{ cents: { type: Number, required: true, min: 1 }, date: { type: Date, required: true }, source: { type: String, required: true, maxlength: 120 } }], default: undefined },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);
