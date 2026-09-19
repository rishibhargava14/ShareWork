import mongoose from 'mongoose';
import { LEAKAGE_ACTIONS, LEAKAGE_DETECTED_TYPES } from '../constants/schemaEnums.js';

const leakageLogSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    detectedType: { type: String, enum: LEAKAGE_DETECTED_TYPES },
    content: { type: String, trim: true },
    maskedContent: { type: String, trim: true },
    action: { type: String, enum: LEAKAGE_ACTIONS, default: 'blocked' },
  },
  { timestamps: true, strict: true },
);

leakageLogSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model('LeakageLog', leakageLogSchema);
