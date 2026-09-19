import mongoose from 'mongoose';
import { ESCROW_STATUSES } from '../constants/schemaEnums.js';

const escrowSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: { type: Number, required: true },
    fee: { type: Number },
    gst: { type: Number },
    net: { type: Number },
    status: { type: String, enum: ESCROW_STATUSES, default: 'locked' },
    lockedAt: { type: Date, default: Date.now },
    releaseAt: { type: Date },
    disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute' },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('Escrow', escrowSchema);
