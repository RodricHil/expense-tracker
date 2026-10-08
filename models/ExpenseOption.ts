import mongoose from "mongoose";
const schema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  kind: { type: String, required: true, enum: ["category", "upiApp"] },
  legacyType: { type: String, required: false },
  archived: { type: Boolean, required: false },
  name: { type: String, required: true, trim: true, maxlength: 60 },
}, { timestamps: true });
schema.index({ userId: 1, kind: 1, name: 1 }, { unique: true });
schema.index({ userId: 1, legacyType: 1 }, { unique: true, partialFilterExpression: { legacyType: { $type: "string" } } });
export default mongoose.models.ExpenseOption || mongoose.model("ExpenseOption", schema);
