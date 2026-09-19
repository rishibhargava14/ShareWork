import mongoose, { Schema, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      required: true,
      validate: [(v: unknown[]) => Array.isArray(v) && v.length === 2, "Conversations need exactly two participants."],
    },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, trim: true, maxlength: 120, default: "" },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export type ConversationDoc = InferSchemaType<typeof conversationSchema>;

export default mongoose.models.Conversation ??
  (mongoose.model("Conversation", conversationSchema) as mongoose.Model<ConversationDoc>);