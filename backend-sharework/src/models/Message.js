import mongoose from 'mongoose';
import {
  AGREEMENT_STATUSES,
  DELIVERABLE_STATUSES,
  MESSAGE_ESCROW_STATUSES,
  MESSAGE_TYPES,
} from '../constants/schemaEnums.js';

const agreementDataSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    scope: { type: String, trim: true },
    deliverables: [{ type: String, trim: true }],
    fixedPrice: { type: Number },
    timelineDays: { type: Number },
    revisions: { type: Number },
    terms: { type: String, trim: true },
    status: { type: String, enum: AGREEMENT_STATUSES, default: 'pending' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { _id: false },
);

const deliverableDataSchema = new mongoose.Schema(
  {
    files: [{ type: String, trim: true }],
    message: { type: String, trim: true },
    status: { type: String, enum: DELIVERABLE_STATUSES, default: 'submitted' },
  },
  { _id: false },
);

const escrowDataSchema = new mongoose.Schema(
  {
    amount: { type: Number },
    status: { type: String, enum: MESSAGE_ESCROW_STATUSES, default: 'locked' },
    transactionId: { type: String, trim: true },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: { type: String, enum: MESSAGE_TYPES, default: 'text' },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile' },
    fileName: { type: String, trim: true },
    fileMimeType: { type: String, trim: true },
    fileSize: { type: Number, min: 0 },
    agreementData: { type: agreementDataSchema, default: undefined },
    deliverableData: { type: deliverableDataSchema, default: undefined },
    escrowData: { type: escrowDataSchema, default: undefined },
    isMasked: { type: Boolean, default: false },
  },
  { timestamps: true, strict: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
