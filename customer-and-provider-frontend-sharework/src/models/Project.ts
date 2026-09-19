import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { PROJECT_STATUSES } from "@/lib/constants";

const projectSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "AGREEMENT_PENDING",
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    timelineDays: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

export type ProjectDoc = InferSchemaType<typeof projectSchema>;

export default mongoose.models.Project ??
  (mongoose.model("Project", projectSchema) as mongoose.Model<ProjectDoc>);