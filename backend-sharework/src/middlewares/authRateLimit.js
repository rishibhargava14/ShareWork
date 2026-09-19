import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts. Try again later.',
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

export const otpSendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many OTP requests. Try again later.',
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});
