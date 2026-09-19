import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { AGREEMENT_STATUSES } from "@/lib/constants";

const agreementSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    scope: { type: String, required: true, trim: true, maxlength: 2000 },
    price: { type: Number, required: true, min: 1 },
    timelineDays: { type: Number, required: true, min: 1 },
    revisions: { type: String, default: "2", trim: true, maxlength: 40 },
    deliverables: { type: String, default: "", trim: true, maxlength: 2000 },
    status: { type: String, enum: AGREEMENT_STATUSES, default: "pending", index: true },
    proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { timestamps: true }
);

export type AgreementDoc = InferSchemaType<typeof agreementSchema>;

export default mongoose.models.Agreement ??
  (mongoose.model("Agreement", agreementSchema) as mongoose.Model<AgreementDoc>);