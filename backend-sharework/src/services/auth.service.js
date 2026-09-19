import mongoose from 'mongoose';
import CustomerProfile from '../models/CustomerProfile.js';
import ProviderProfile from '../models/ProviderProfile.js';
import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { PUBLIC_SIGNUP_ROLES } from '../constants/roles.js';
import { AppError } from '../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import {
  OTP_COOLDOWN_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  OTP_PURPOSE,
  OTP_RESEND_WINDOW_MS,
  OTP_SELECT,
  buildOtpExpiry,
  clearOtpSlot,
  compareOtp,
  generateOtp,
  getOtpSlot,
  hashOtp,
  invalidateOtpValue,
  isOtpExpired,
  remainingCooldownSec,
} from '../utils/otp.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { toSafeUser } from '../utils/safeUser.js';
import { sendOtpEmail } from './mail.service.js';

const INVALID_CREDENTIALS = 'Invalid credentials';
const ACCOUNT_UNAVAILABLE = 'Account is not available';
const INVALID_OTP = 'Invalid OTP';
const EXPIRED_OTP = 'OTP has expired. Request a new code.';
const OTP_LOCKED = 'Too many attempts. Request a new code.';
const OTP_COOLDOWN = 'Please wait before requesting another OTP';
const OTP_RESEND_LIMIT = 'Too many OTP requests. Try again later.';
const EMAIL_NOT_VERIFIED = 'Email verification required';

const PROVIDER_SIGNUP_DEFAULTS = Object.freeze({
  title: 'New Provider',
  categories: ['Web'],
  startingPrice: 5000,
  availability: {
    onlineStatus: 'offline',
    weeklySchedule: [],
    capacityAvailable: 3,
  },
});

const issueTokens = (user) => ({
  token: signAccessToken(user),
  refreshToken: signRefreshToken(user),
});

const otpSentPayload = (retryAfterSeconds = OTP_COOLDOWN_SEC) => ({
  message: 'OTP sent',
  retryAfterSeconds,
});

const cooldownError = (retryAfterSeconds) =>
  new AppError(OTP_COOLDOWN, HTTP_STATUS.TOO_MANY_REQUESTS, { retryAfterSeconds });

const assignOtp = async (user, purpose) => {
  const slot = getOtpSlot(purpose);
  const now = Date.now();
  const windowStart = user[slot.resendWindowStart];

  if (!windowStart || now - windowStart.getTime() >= OTP_RESEND_WINDOW_MS) {
    user[slot.resendWindowStart] = new Date(now);
    user[slot.resendCount] = 0;
  }

  const wait = remainingCooldownSec(user, purpose);
  if (wait > 0) {
    throw cooldownError(wait);
  }

  if ((user[slot.resendCount] || 0) >= OTP_MAX_RESENDS) {
    throw new AppError(OTP_RESEND_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  const otp = generateOtp();
  user[slot.hash] = await hashOtp(otp);
  user[slot.expiry] = buildOtpExpiry();
  user[slot.attempts] = 0;
  user[slot.lastSentAt] = new Date(now);
  user[slot.resendCount] = (user[slot.resendCount] || 0) + 1;
  return otp;
};

const consumeOtp = async (user, purpose, otp) => {
  const slot = getOtpSlot(purpose);
  const hash = user[slot.hash];
  const expired = isOtpExpired(user[slot.expiry]);

  if (!hash || expired) {
    invalidateOtpValue(user, purpose);
    await user.save();
    throw new AppError(expired && hash ? EXPIRED_OTP : INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
  }

  const matches = await compareOtp(otp, hash);
  if (matches) {
    return;
  }

  user[slot.attempts] = (user[slot.attempts] || 0) + 1;
  if (user[slot.attempts] >= OTP_MAX_ATTEMPTS) {
    invalidateOtpValue(user, purpose);
    await user.save();
    throw new AppError(OTP_LOCKED, HTTP_STATUS.BAD_REQUEST);
  }

  await user.save();
  throw new AppError(INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
};

const issueAndSendOtp = async (user, purpose) => {
  const otp = await assignOtp(user, purpose);
  await user.save();
  await sendOtpEmail(user.email, otp, purpose);
  return otpSentPayload();
};

const createProfile = async (user, session) => {
  const options = session ? { session } : {};

  if (user.role === 'customer') {
    await CustomerProfile.create([{ userId: user._id }], options);
    return;
  }

  await ProviderProfile.create(
    [
      {
        userId: user._id,
        ...PROVIDER_SIGNUP_DEFAULTS,
      },
    ],
    options,
  );
};

const persistSignup = async (userPayload) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const [user] = await User.create([userPayload], { session });
    await createProfile(user, session);
    await session.commitTransaction();
    return user;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const persistSignupWithCompensation = async (userPayload) => {
  const user = await User.create(userPayload);

  try {
    await createProfile(user);
    return user;
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
};

const createUserWithProfile = async (userPayload) => {
  try {
    return await persistSignup(userPayload);
  } catch (error) {
    if (error.code === 11000) {
      throw error;
    }

    const message = String(error.message || '');
    const transactionsUnsupported =
      message.includes('Transaction numbers are only allowed') ||
      message.includes('replica set member') ||
      error.codeName === 'IllegalOperation';

    if (!transactionsUnsupported) {
      throw error;
    }

    return persistSignupWithCompensation(userPayload);
  }
};

export const signup = async ({ name, email, phone, password, role }) => {
  if (!PUBLIC_SIGNUP_ROLES.includes(role)) {
    throw new AppError('Invalid role', HTTP_STATUS.BAD_REQUEST);
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError('Email already registered', HTTP_STATUS.CONFLICT);
  }

  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new AppError('Phone already registered', HTTP_STATUS.CONFLICT);
  }

  const passwordHash = await hashPassword(password);
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const now = new Date();

  const user = await createUserWithProfile({
    name,
    email,
    phone,
    passwordHash,
    role,
    otp: otpHash,
    otpExpiry: buildOtpExpiry(),
    otpAttempts: 0,
    otpLastSentAt: now,
    otpResendCount: 1,
    otpResendWindowStart: now,
    isVerified: false,
  });

  await sendOtpEmail(user.email, otp, OTP_PURPOSE.VERIFY);

  return {
    user: toSafeUser(user),
    requiresVerification: true,
    ...otpSentPayload(),
  };
};

export const refreshSession = async ({ refreshToken }) => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (!payload?.userId) {
    throw new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
  }

  const user = await User.findById(payload.userId);

  if (!user) {
    throw new AppError('Invalid or expired token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (user.isBanned) {
    throw new AppError(ACCOUNT_UNAVAILABLE, HTTP_STATUS.FORBIDDEN);
  }

  if (!user.isVerified) {
    throw new AppError(EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
  }

  return {
    user: toSafeUser(user),
    ...issueTokens(user),
  };
};

export const verifyOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select(OTP_SELECT);

  if (!user || user.isBanned) {
    throw new AppError(INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
  }

  if (user.isVerified) {
    if (user.role !== 'admin') {
      return { verified: true };
    }

    await consumeOtp(user, OTP_PURPOSE.VERIFY, otp);
    clearOtpSlot(user, OTP_PURPOSE.VERIFY);
    await user.save();

    return {
      verified: true,
      user: toSafeUser(user),
      ...issueTokens(user),
    };
  }

  await consumeOtp(user, OTP_PURPOSE.VERIFY, otp);

  user.isVerified = true;
  clearOtpSlot(user, OTP_PURPOSE.VERIFY);
  await user.save();

  return {
    verified: true,
    user: toSafeUser(user),
    ...issueTokens(user),
  };
};

export const resendOtp = async ({ email, purpose }) => {
  const user = await User.findOne({ email }).select(OTP_SELECT);

  if (purpose === OTP_PURPOSE.VERIFY) {
    if (!user || user.isBanned) {
      return otpSentPayload();
    }
    if (user.isVerified && user.role !== 'admin') {
      return otpSentPayload();
    }
  } else if (!user || user.isBanned) {
    return otpSentPayload();
  }

  return issueAndSendOtp(user, purpose);
};

export const login = async ({ email, password, role }) => {
  const user = await User.findOne({ email }).select(`+passwordHash ${OTP_SELECT}`);

  if (!user) {
    throw new AppError(INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  if (user.role !== role) {
    throw new AppError(INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
  }

  if (user.isBanned) {
    throw new AppError(ACCOUNT_UNAVAILABLE, HTTP_STATUS.FORBIDDEN);
  }

  if (!user.isVerified) {
    let retryAfterSeconds = remainingCooldownSec(user, OTP_PURPOSE.VERIFY) || OTP_COOLDOWN_SEC;

    try {
      const sent = await issueAndSendOtp(user, OTP_PURPOSE.VERIFY);
      retryAfterSeconds = sent.retryAfterSeconds;
    } catch (error) {
      if (error.statusCode !== HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw error;
      }
      retryAfterSeconds = error.details?.retryAfterSeconds || retryAfterSeconds;
    }

    return {
      user: toSafeUser(user),
      requiresVerification: true,
      ...otpSentPayload(retryAfterSeconds),
    };
  }

  if (user.role === 'admin') {
    let retryAfterSeconds = remainingCooldownSec(user, OTP_PURPOSE.VERIFY) || OTP_COOLDOWN_SEC;

    try {
      const sent = await issueAndSendOtp(user, OTP_PURPOSE.VERIFY);
      retryAfterSeconds = sent.retryAfterSeconds;
    } catch (error) {
      if (error.statusCode !== HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw error;
      }
      retryAfterSeconds = error.details?.retryAfterSeconds || retryAfterSeconds;
    }

    return {
      user: toSafeUser(user),
      requiresOtp: true,
      ...otpSentPayload(retryAfterSeconds),
    };
  }

  return {
    user: toSafeUser(user),
    ...issueTokens(user),
  };
};

export const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email }).select(OTP_SELECT);

  if (user && !user.isBanned) {
    try {
      await issueAndSendOtp(user, OTP_PURPOSE.RESET);
    } catch (error) {
      if (error.statusCode !== HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw error;
      }
    }
  }

  return {
    message: 'OTP sent',
  };
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email }).select(`${OTP_SELECT} +passwordHash`);

  if (!user || user.isBanned) {
    throw new AppError(INVALID_OTP, HTTP_STATUS.BAD_REQUEST);
  }

  await consumeOtp(user, OTP_PURPOSE.RESET, otp);

  user.passwordHash = await hashPassword(newPassword);
  clearOtpSlot(user, OTP_PURPOSE.RESET);
  await user.save();

  return {
    message: 'Password updated',
  };
};

export const loadProfile = async (user) => {
  if (user.role === 'customer') {
    return CustomerProfile.findOne({ userId: user._id });
  }

  if (user.role === 'provider') {
    return ProviderProfile.findOne({ userId: user._id });
  }

  return null;
};
