import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const buildPayload = (user) => ({
  userId: String(user._id ?? user.id ?? user.userId),
  role: user.role,
});

export const signAccessToken = (user) =>
  jwt.sign(buildPayload(user), env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

export const signRefreshToken = (user) =>
  jwt.sign(buildPayload(user), env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);
