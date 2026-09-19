import mongoose from 'mongoose';
import { REQUIREMENT_STATUSES } from '../constants/schemaEnums.js';

const requirementSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      index: true,
    },
    budget: { type: Number, required: true, min: 0, max: 10_000_000 },
    deadline: { type: Date, required: true },
    skills: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 1 && value.length <= 20,
        message: 'skills must contain between 1 and 20 items',
      },
    },
    status: {
      type: String,
      enum: REQUIREMENT_STATUSES,
      default: 'open',
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

requirementSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model('Requirement', requirementSchema);
