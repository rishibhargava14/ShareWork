import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40, unique: true },
    slug: { type: String, required: true, trim: true, maxlength: 60, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('Category', categorySchema);
