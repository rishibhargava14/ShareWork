import User from '../models/User.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';

const extractBearerToken = (header) => {
  if (!header || typeof header !== 'string') {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
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
    throw new AppError('Account is not available', HTTP_STATUS.FORBIDDEN);
  }

  if (!user.isVerified) {
    throw new AppError('Email verification required', HTTP_STATUS.FORBIDDEN);
  }

  req.user = {
    id: String(user._id),
    role: user.role,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
  };

  next();
});

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload?.userId) {
      next();
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user || user.isBanned || !user.isVerified) {
      next();
      return;
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    };
  } catch {
    /* public file kinds still work without a valid token */
  }

  next();
});
