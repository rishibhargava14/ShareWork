import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { WITHDRAWAL_STATUSES } from "@/lib/constants";

const withdrawalSchema = new Schema(
  {
    provider: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    payoutMethod: { type: String, required: true },
    status: { type: String, enum: WITHDRAWAL_STATUSES, default: "pending" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export type WithdrawalDoc = InferSchemaType<typeof withdrawalSchema>;

export default mongoose.models.Withdrawal ??
  (mongoose.model("Withdrawal", withdrawalSchema) as mongoose.Model<WithdrawalDoc>);