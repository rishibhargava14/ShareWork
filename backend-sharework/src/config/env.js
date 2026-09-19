import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.resolve(backendRoot, '.env') });
dotenv.config({ path: path.resolve(backendRoot, '..', '.env') });

const PLACEHOLDER_PATTERN = /replace_me|replace_with|changeme|your[_-]?secret/i;

const PRODUCTION_SECRET_KEYS = Object.freeze([
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'RESEND_API_KEY',
]);

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535),
    NODE_ENV: z.enum(['development', 'test', 'production']),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1, 'JWT_REFRESH_EXPIRES_IN is required'),
    CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
    CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
    RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
    PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100),
    GST_ON_FEE_PERCENT: z.coerce.number().min(0).max(100),
    AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
    AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
    AWS_BUCKET: z.string().min(1, 'AWS_BUCKET is required'),
    AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    RESEND_FROM: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : String(value).trim()),
      z.string().min(3, 'RESEND_FROM must be a sender address').optional(),
    ),
    OTP_EXPIRY_MIN: z.coerce.number().int().positive(),
    BCRYPT_SALT_ROUNDS: z.preprocess(
      (value) => (value === undefined || value === '' ? 12 : value),
      z.coerce.number().int().min(10).max(15),
    ),
    DEV_OTP: z.preprocess(
      (value) => (value === '' || value === undefined ? undefined : value),
      z.string().regex(/^\d{6}$/, 'DEV_OTP must be a 6-digit code').optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const origins = data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
    if (origins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN must include at least one origin',
      });
    }

    if (data.NODE_ENV !== 'production') {
      return;
    }

    if (data.DEV_OTP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DEV_OTP'],
        message: 'DEV_OTP is not allowed in production',
      });
    }

    if (data.JWT_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_SECRET',
      });
    }

    for (const key of PRODUCTION_SECRET_KEYS) {
      if (PLACEHOLDER_PATTERN.test(data[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Insecure placeholder value is not allowed in production',
        });
      }
    }
  });

const applyEnvAliases = (source) => {
  const data = { ...source };

  if (!data.MONGODB_URI && data.MONGO_URI) {
    data.MONGODB_URI = data.MONGO_URI;
  }

  if (!data.JWT_EXPIRES_IN && data.JWT_EXPIRE) {
    data.JWT_EXPIRES_IN = data.JWT_EXPIRE;
  }

  if (!data.JWT_REFRESH_EXPIRES_IN && data.JWT_REFRESH_EXPIRE) {
    data.JWT_REFRESH_EXPIRES_IN = data.JWT_REFRESH_EXPIRE;
  }

  if (!data.DEV_OTP && data.MVP_OTP) {
    data.DEV_OTP = data.MVP_OTP;
  }

  if (!data.RESEND_FROM && data.MAIL_FROM) {
    data.RESEND_FROM = data.MAIL_FROM;
  }

  if (!data.RESEND_FROM && data.EMAIL_FROM) {
    data.RESEND_FROM = data.EMAIL_FROM;
  }

  return data;
};

export const validateEnvironment = (source) => envSchema.safeParse(applyEnvAliases(source));

const parsed = validateEnvironment(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    const path = issue.path.join('.') || 'unknown';
    console.error(`  - ${path}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export const corsOrigins = [...new Set([
  env.CLIENT_URL,
  ...env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
])];
