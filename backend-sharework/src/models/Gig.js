import mongoose from 'mongoose';
import {
  GIG_PACKAGE_COUNT,
  GIG_PACKAGE_NAMES,
  GIG_PACKAGE_PRICES,
  GIG_PACKAGE_TIERS,
} from '../constants/gigPackages.js';

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, enum: GIG_PACKAGE_NAMES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    fixedPrice: { type: Number, required: true, enum: GIG_PACKAGE_PRICES },
    deliveryDays: { type: Number, required: true, min: 1 },
    revisions: { type: Number, required: true, min: 0 },
    features: [{ type: String, trim: true }],
  },
  { _id: false },
);

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true },
    answer: { type: String, trim: true },
  },
  { _id: false },
);

const validatePackageSet = (packages) => {
  if (!Array.isArray(packages) || packages.length !== GIG_PACKAGE_COUNT) {
    return false;
  }

  const names = packages.map((item) => item.name);
  if (new Set(names).size !== GIG_PACKAGE_COUNT) {
    return false;
  }

  return packages.every((item) => GIG_PACKAGE_TIERS[item.name] === item.fixedPrice);
};

const gigSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      index: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    portfolioImages: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile' },
        originalName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, min: 0 },
      },
    ],
    packages: {
      type: [packageSchema],
      required: true,
      validate: {
        validator: validatePackageSet,
        message:
          'Gig must contain exactly 3 packages (Basic 5000, Standard 15000, Premium 35000)',
      },
    },
    faqs: [faqSchema],
    requirements: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true, index: true },
    views: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
  },
  { timestamps: true, strict: true },
);

gigSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Gig', gigSchema);
