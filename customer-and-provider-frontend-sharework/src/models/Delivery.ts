import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { DELIVERY_STATUSES } from "@/lib/constants";

const deliverySchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: DELIVERY_STATUSES, default: "pending" },
    approvedAt: { type: Date },
    revisionNote: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

export type DeliveryDoc = InferSchemaType<typeof deliverySchema>;

export default mongoose.models.Delivery ??
  (mongoose.model("Delivery", deliverySchema) as mongoose.Model<DeliveryDoc>);