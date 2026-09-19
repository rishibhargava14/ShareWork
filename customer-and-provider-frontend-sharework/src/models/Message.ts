import mongoose, { Schema, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema>;

export default mongoose.models.Message ??
  (mongoose.model("Message", messageSchema) as mongoose.Model<MessageDoc>);