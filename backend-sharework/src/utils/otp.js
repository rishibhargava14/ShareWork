import { randomInt } from 'node:crypto';
import { env } from '../config/env.js';
import { comparePassword, hashPassword } from './password.js';

const OTP_LENGTH = 6;

export const OTP_PURPOSE = Object.freeze({
  VERIFY: 'verify',
  RESET: 'reset',
});

export const OTP_COOLDOWN_SEC = 45;
export const OTP_MAX_RESENDS = 5;
export const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_SELECT = [
  '+otp',
  '+otpExpiry',
  '+otpAttempts',
  '+otpLastSentAt',
  '+otpResendCount',
  '+otpResendWindowStart',
  '+resetOtp',
  '+resetOtpExpiry',
  '+resetOtpAttempts',
  '+resetOtpLastSentAt',
  '+resetOtpResendCount',
  '+resetOtpResendWindowStart',
].join(' ');

const SLOTS = Object.freeze({
  [OTP_PURPOSE.VERIFY]: Object.freeze({
    hash: 'otp',
    expiry: 'otpExpiry',
    attempts: 'otpAttempts',
    lastSentAt: 'otpLastSentAt',
    resendCount: 'otpResendCount',
    resendWindowStart: 'otpResendWindowStart',
  }),
  [OTP_PURPOSE.RESET]: Object.freeze({
    hash: 'resetOtp',
    expiry: 'resetOtpExpiry',
    attempts: 'resetOtpAttempts',
    lastSentAt: 'resetOtpLastSentAt',
    resendCount: 'resetOtpResendCount',
    resendWindowStart: 'resetOtpResendWindowStart',
  }),
});

export const generateOtp = () => {
  if (env.NODE_ENV !== 'production' && env.DEV_OTP) {
    return env.DEV_OTP;
  }

  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
};

export const hashOtp = (otp) => hashPassword(otp);

export const compareOtp = (otp, otpHash) => comparePassword(otp, otpHash);

export const buildOtpExpiry = () =>
  new Date(Date.now() + env.OTP_EXPIRY_MIN * 60 * 1000);

export const isOtpExpired = (otpExpiry) => !otpExpiry || otpExpiry.getTime() <= Date.now();

export const getOtpSlot = (purpose) => {
  const slot = SLOTS[purpose];
  if (!slot) {
    throw new Error('Invalid OTP purpose');
  }
  return slot;
};

export const remainingCooldownSec = (user, purpose) => {
  const lastSentAt = user[getOtpSlot(purpose).lastSentAt];
  if (!lastSentAt) {
    return 0;
  }

  const wait = OTP_COOLDOWN_SEC - (Date.now() - lastSentAt.getTime()) / 1000;
  return wait > 0 ? Math.ceil(wait) : 0;
};

export const invalidateOtpValue = (user, purpose) => {
  const slot = getOtpSlot(purpose);
  user[slot.hash] = undefined;
  user[slot.expiry] = undefined;
  user[slot.attempts] = undefined;
};

export const clearOtpSlot = (user, purpose) => {
  const slot = getOtpSlot(purpose);
  user[slot.hash] = undefined;
  user[slot.expiry] = undefined;
  user[slot.attempts] = undefined;
  user[slot.lastSentAt] = undefined;
  user[slot.resendCount] = undefined;
  user[slot.resendWindowStart] = undefined;
};
