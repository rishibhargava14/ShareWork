import { z } from 'zod';
import { PUBLIC_SIGNUP_ROLES, USER_ROLES } from '../constants/roles.js';

const normalizeEmail = (email) => String(email).trim().toLowerCase();

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().transform(normalizeEmail),
  phone: z.string().trim().min(1),
  password: z.string().min(8).max(128),
  role: z.enum(PUBLIC_SIGNUP_ROLES),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  password: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  purpose: z.enum(['verify', 'reset']),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().transform(normalizeEmail),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
  newPassword: z.string().min(8).max(128),
});
