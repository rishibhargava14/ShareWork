import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/roles.js';

const hideSensitive = (_doc, ret) => {
  delete ret.passwordHash;
  delete ret.otp;
  delete ret.otpExpiry;
  delete ret.otpAttempts;
  delete ret.otpLastSentAt;
  delete ret.otpResendCount;
  delete ret.otpResendWindowStart;
  delete ret.resetOtp;
  delete ret.resetOtpExpiry;
  delete ret.resetOtpAttempts;
  delete ret.resetOtpLastSentAt;
  delete ret.resetOtpResendCount;
  delete ret.resetOtpResendWindowStart;
  return ret;
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    avatar: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpAttempts: { type: Number, select: false },
    otpLastSentAt: { type: Date, select: false },
    otpResendCount: { type: Number, select: false },
    otpResendWindowStart: { type: Date, select: false },
    resetOtp: { type: String, select: false },
    resetOtpExpiry: { type: Date, select: false },
    resetOtpAttempts: { type: Number, select: false },
    resetOtpLastSentAt: { type: Date, select: false },
    resetOtpResendCount: { type: Number, select: false },
    resetOtpResendWindowStart: { type: Date, select: false },
    isBanned: { type: Boolean, default: false },
    bannedReason: { type: String, trim: true },
  },
  { timestamps: true, strict: true },
);

userSchema.set('toJSON', { transform: hideSensitive });
userSchema.set('toObject', { transform: hideSensitive });

export default mongoose.model('User', userSchema);
