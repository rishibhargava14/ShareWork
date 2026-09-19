import mongoose from 'mongoose';
import {
  PAYMENT_GATEWAYS,
  PROJECT_REQUIRED_TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '../constants/schemaEnums.js';

const transactionSchema = new mongoose.Schema(
  {
    // HTML Transaction.projectId is required. HTML withdraw has no project.
    // projectId is required for all project money types and omitted only for withdrawal.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
      required() {
        return PROJECT_REQUIRED_TRANSACTION_TYPES.includes(this.type);
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    upiId: { type: String, trim: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: { type: String, enum: TRANSACTION_STATUSES, default: 'pending' },
    paymentGateway: { type: String, enum: PAYMENT_GATEWAYS, default: 'razorpay' },
    gatewayTransactionId: { type: String, trim: true },
    escrowStatus: { type: String, trim: true },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('Transaction', transactionSchema);
