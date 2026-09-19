import mongoose from 'mongoose';
import {
  EXPERIENCE_LEVELS,
  ONLINE_STATUSES,
  WEEKLY_DAYS,
} from '../constants/schemaEnums.js';

const weeklyDaySchema = new mongoose.Schema(
  {
    day: { type: String, enum: WEEKLY_DAYS, required: true },
    enabled: { type: Boolean, default: true },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
  },
  { _id: false },
);

const portfolioItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    link: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false },
);

const providerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, maxlength: 1000 },
    skills: [{ type: String, trim: true }],
    categories: {
      type: [{ type: String, trim: true, maxlength: 40, required: true }],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 1,
        message: 'at least one category is required',
      },
    },
    experienceLevel: {
      type: String,
      enum: EXPERIENCE_LEVELS,
      default: 'intermediate',
    },
    languages: [{ type: String, trim: true }],
    portfolio: [portfolioItemSchema],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 },
    startingPrice: { type: Number, required: true, min: 500 },
    isAvailable: { type: Boolean, default: true },
    availability: {
      onlineStatus: { type: String, enum: ONLINE_STATUSES, default: 'offline' },
      weeklySchedule: [weeklyDaySchema],
      vacationMode: {
        enabled: { type: Boolean, default: false },
        startDate: { type: Date },
        endDate: { type: Date },
      },
      capacityAvailable: { type: Number, default: 3, min: 0 },
    },
  },
  { timestamps: true, strict: true },
);

providerProfileSchema.index({ categories: 1, rating: -1 });

export default mongoose.model('ProviderProfile', providerProfileSchema);
