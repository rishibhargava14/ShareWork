import mongoose from 'mongoose';
import { CONVERSATION_ESCROW_STATUSES } from '../constants/schemaEnums.js';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig' },
    lastMessage: { type: String, trim: true },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCount: { type: Map, of: Number, default: {} },
    escrowStatus: {
      type: String,
      enum: CONVERSATION_ESCROW_STATUSES,
      default: 'none',
    },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, trim: true },
  },
  { timestamps: true, strict: true },
);

conversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', conversationSchema);
