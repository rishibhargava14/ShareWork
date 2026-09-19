import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

const skipInTest = () => env.NODE_ENV === 'test';

const userOrIpKey = (req) => req.user?.id || req.ip;

const limiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  skip: skipInTest,
  validate: false,
};

export const messageRateLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many messages. Try again later.',
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

export const agreementRateLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many agreement attempts. Try again later.',
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});
