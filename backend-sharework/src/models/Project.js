import mongoose from 'mongoose';
import {
  DELIVERABLE_STATUSES,
  PROJECT_ESCROW_STATUSES,
  PROJECT_STATUSES,
} from '../constants/schemaEnums.js';

const projectEscrowSchema = new mongoose.Schema(
  {
    amount: { type: Number },
    feePercent: { type: Number, default: 10 },
    fee: { type: Number },
    gstPercent: { type: Number, default: 18 },
    gst: { type: Number },
    net: { type: Number },
    status: { type: String, enum: PROJECT_ESCROW_STATUSES, default: 'pending' },
    fundedAt: { type: Date },
    releasedAt: { type: Date },
  },
  { _id: false },
);

const deliverableHistorySchema = new mongoose.Schema(
  {
    files: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile' },
        originalName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, min: 0 },
      },
    ],
    message: { type: String, trim: true },
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: DELIVERABLE_STATUSES, default: 'submitted' },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gigId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gig' },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    scope: { type: String, required: true, trim: true },
    deliverables: [{ type: String, required: true, trim: true }],
    fixedPrice: { type: Number, required: true },
    timelineDays: { type: Number, required: true },
    revisionsAllowed: { type: Number, default: 2 },
    revisionsUsed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: 'discussion',
      index: true,
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    escrow: { type: projectEscrowSchema, default: () => ({}) },
    deliverablesHistory: [deliverableHistorySchema],
    deadline: { type: Date, required: true, index: true },
    approvedAt: { type: Date },
    completedAt: { type: Date },
    razorpayOrderId: { type: String, trim: true },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('Project', projectSchema);
