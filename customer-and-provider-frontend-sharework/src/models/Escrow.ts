import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ESCROW_STATUSES } from "@/lib/constants";

const escrowSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ESCROW_STATUSES, default: "pending", index: true },
    fundedAt: { type: Date },
    releasedAt: { type: Date },
  },
  { timestamps: true }
);

export type EscrowDoc = InferSchemaType<typeof escrowSchema>;

export default mongoose.models.Escrow ??
  (mongoose.model("Escrow", escrowSchema) as mongoose.Model<EscrowDoc>);