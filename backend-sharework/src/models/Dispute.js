import mongoose from 'mongoose';
import { DISPUTE_STATUSES } from '../constants/schemaEnums.js';

const disputeSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: DISPUTE_STATUSES, default: 'open' },
    resolution: { type: String, trim: true },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('Dispute', disputeSchema);
