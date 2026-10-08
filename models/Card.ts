import mongoose from "mongoose";
import { CARD_NAME_MAX_LENGTH, CARD_TYPES } from "@/lib/payment";

/**
 * A saved payment card, reduced to what the UI needs to label a transaction.
 *
 * Deliberately has no field for the card number, CVV, PIN, OTP or expiry. The
 * API schema strips unknown keys and `strict` mode here drops anything that
 * still slips through, so none of those can be persisted by accident.
 */
const CardSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: CARD_TYPES,
    },
    network: { type: String, enum: ["visa", "mastercard", "rupay", null] },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CARD_NAME_MAX_LENGTH,
    },
    last4: {
      type: String,
      required: true,
      match: /^[0-9]{4}$/,
    },
  },
  { timestamps: true, strict: true }
);

CardSchema.index({ userId: 1, type: 1 });

export default mongoose.models.Card || mongoose.model("Card", CardSchema);
