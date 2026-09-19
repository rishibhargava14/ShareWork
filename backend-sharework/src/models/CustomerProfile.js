import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 500 },
    totalSpent: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    preferredCategories: [{ type: String, trim: true }],
    country: { type: String, trim: true, maxlength: 56, default: '' },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('CustomerProfile', customerProfileSchema);
