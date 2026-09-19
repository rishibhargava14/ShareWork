import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';

const JSON_FIELDS = ['packages', 'faqs'];
const BLOCKED_FIELDS = [
  'providerId',
  'views',
  'orders',
  'rating',
  'reviewsCount',
  'passwordHash',
  'otp',
  'otpExpiry',
  'otpAttempts',
  'otpLastSentAt',
  'otpResendCount',
  'otpResendWindowStart',
  'resetOtp',
  'resetOtpExpiry',
  'resetOtpAttempts',
  'resetOtpLastSentAt',
  'resetOtpResendCount',
  'resetOtpResendWindowStart',
  'portfolioImages',
];

const parseJsonField = (value, field) => {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new AppError(`Malformed ${field} payload`, HTTP_STATUS.BAD_REQUEST);
  }
};

export const parseGigBody = (req, _res, next) => {
  try {
    for (const field of BLOCKED_FIELDS) {
      delete req.body[field];
    }

    for (const field of JSON_FIELDS) {
      const parsed = parseJsonField(req.body[field], field);
      if (parsed === undefined) {
        delete req.body[field];
      } else {
        req.body[field] = parsed;
      }
    }

    if (req.body.requirements === '') {
      delete req.body.requirements;
    }

    next();
  } catch (error) {
    next(error);
  }
};
