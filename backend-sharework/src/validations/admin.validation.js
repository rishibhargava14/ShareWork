import { z } from 'zod';
import {
  DISPUTE_STATUSES,
  PROJECT_STATUSES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '../constants/schemaEnums.js';
import { objectIdSchema } from './user.validation.js';

const emptyToUndefined = (value) => (value === '' || value === undefined ? undefined : value);

const booleanQuery = z.preprocess((value) => {
  if (value === '' || value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean().optional());

export const adminIdParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const listAdminUsersQuerySchema = z
  .object({
    role: z.preprocess(emptyToUndefined, z.enum(['customer', 'provider']).optional()),
    q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    isBanned: booleanQuery,
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
  })
  .strict();

export const listAdminDisputesQuerySchema = z
  .object({
    status: z.preprocess(emptyToUndefined, z.enum(DISPUTE_STATUSES).optional()),
  })
  .strict();

export const updateAdminSettingsSchema = z
  .object({
    feePercent: z.coerce.number().min(0).max(100).optional(),
    gstPercent: z.coerce.number().min(0).max(100).optional(),
    maintenance: z.boolean().optional(),
  })
  .strict();

export const listAdminProjectsQuerySchema = z
  .object({
    status: z.preprocess(emptyToUndefined, z.enum(PROJECT_STATUSES).optional()),
    q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  })
  .strict();

export const listAdminTransactionsQuerySchema = z
  .object({
    type: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_TYPES).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_STATUSES).optional()),
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
  })
  .strict();

export const listAdminWithdrawalsQuerySchema = z
  .object({
    status: z.preprocess(emptyToUndefined, z.enum(TRANSACTION_STATUSES).optional()),
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
  })
  .strict();

export const listAdminAuditQuerySchema = z
  .object({
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
  })
  .strict();

export const resolveDisputeSchema = z
  .object({
    resolution: z.string().trim().min(1).max(2000),
    refund: z.boolean().optional(),
    split: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.refund === true && data.split === true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['split'],
        message: 'Cannot refund and split in the same resolution',
      });
    }
  });

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(40),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: 'No category fields to update',
  });

export const banUserSchema = z
  .object({
    isBanned: z.boolean(),
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.isBanned && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Reason is required when banning',
      });
    }
  });
