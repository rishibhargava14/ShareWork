import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
  },
  { timestamps: true, strict: true },
);

export default mongoose.model('AdminUser', adminUserSchema);
