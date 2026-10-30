import mongoose from "mongoose";
import { INVESTMENT_TYPES, INVESTMENT_STATUSES, INVESTMENT_CURRENCIES, CONTRIBUTION_FREQUENCIES } from "@/lib/investments";
const money = { type: Number, min: 0, max: 100_000_000_000, validate: (value: number | null) => value === null || Number.isSafeInteger(value) };
const schema = new mongoose.Schema({
  userId: { type: String, required: true }, name: { type: String, required: true, maxlength: 80 },
  type: { type: String, required: true, enum: INVESTMENT_TYPES }, status: { type: String, required: true, enum: INVESTMENT_STATUSES },
  currency: { type: String, required: true, enum: INVESTMENT_CURRENCIES, immutable: true }, investedCents: { ...money, required: true },
  currentValueCents: { ...money, default: null }, contributionCents: { ...money, default: null },
  frequency: { type: String, required: true, enum: CONTRIBUTION_FREQUENCIES }, startDate: { type: String, required: true }, maturityDate: { type: String, default: null },
}, { timestamps: true });
schema.index({ userId: 1, currency: 1, startDate: -1, _id: -1 });
export default mongoose.models.Investment || mongoose.model("Investment", schema);
