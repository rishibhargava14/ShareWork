import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/schemaEnums.js';
import { objectIdSchema } from './user.validation.js';

export const projectIdParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const listProjectsQuerySchema = z
  .object({
    role: z.enum(['customer', 'provider']),
    status: z.enum(PROJECT_STATUSES).optional(),
  })
  .strict();

export const submitDeliverableSchema = z
  .object({
    message: z.string().trim().min(1).max(1000),
  })
  .strict();

export const requestRevisionSchema = z
  .object({
    message: z.string().trim().min(1).max(1000),
  })
  .strict();

export const createDisputeSchema = z
  .object({
    reason: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(2000),
  })
  .strict();

export const createReviewSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();
