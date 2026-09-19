import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';
import { redactSecrets } from '../utils/redact.js';

const buildErrorBody = ({ message, details, stack }) => {
  const body = {
    success: false,
    message: env.NODE_ENV === 'development' ? message : redactSecrets(message),
  };

  if (details) {
    body.details = details;
  }

  if (env.NODE_ENV === 'development' && stack) {
    body.stack = stack;
  }

  return body;
};

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      buildErrorBody({
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        stack: err.stack,
      }),
    );
  }

  if (err.name === 'ValidationError' && err.errors) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      buildErrorBody({
        message: 'Validation failed',
        details: Object.values(err.errors).map((item) => item.message),
        stack: err.stack,
      }),
    );
  }

  if (err.name === 'CastError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      buildErrorBody({
        message: 'Invalid identifier',
        details: err.path ? { path: err.path } : null,
        stack: err.stack,
      }),
    );
  }

  if (err.code === 11000) {
    return res.status(HTTP_STATUS.CONFLICT).json(
      buildErrorBody({
        message: 'Duplicate value',
        details: err.keyValue ?? null,
        stack: err.stack,
      }),
    );
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      buildErrorBody({
        message: err.message,
        details: err.details,
        stack: err.stack,
      }),
    );
  }

  // Third-party SDKs may attach HTTP statusCode (Razorpay 401). Never treat that as a missing JWT.
  const rawStatus = Number(err.statusCode || err.status) || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const authCollision =
    rawStatus === HTTP_STATUS.UNAUTHORIZED || rawStatus === HTTP_STATUS.FORBIDDEN;
  const statusCode = authCollision ? HTTP_STATUS.INTERNAL_SERVER_ERROR : rawStatus;
  const message =
    env.NODE_ENV === 'production' && statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(statusCode).json(
    buildErrorBody({
      message,
      stack: err.stack,
    }),
  );
};
