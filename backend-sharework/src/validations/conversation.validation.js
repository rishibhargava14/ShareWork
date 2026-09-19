import { z } from 'zod';
import { GIG_PACKAGE_PRICES } from '../constants/gigPackages.js';
import { objectIdSchema } from './user.validation.js';

export const createConversationSchema = z
  .object({
    providerId: objectIdSchema,
    gigId: objectIdSchema.optional(),
  })
  .strict();

export const sendMessageSchema = z
  .object({
    type: z.enum(['text', 'file']).default('text'),
    content: z.string().trim().min(1).max(5000),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.type === 'file' && !body.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: 'File messages require a caption or filename',
      });
    }
  });

export const createAgreementSchema = z
  .object({
    title: z.string().trim().min(5).max(100),
    scope: z.string().trim().min(20).max(2000),
    deliverables: z.array(z.string().trim().min(1)).min(1),
    fixedPrice: z.coerce.number().refine((value) => GIG_PACKAGE_PRICES.includes(value), {
      message: 'fixedPrice must be 5000, 15000, or 35000',
    }),
    timelineDays: z.coerce.number().int().min(1).max(90),
    revisions: z.coerce.number().int().min(0).max(10),
    terms: z.string().trim().max(1000).optional(),
  })
  .strict();

export const rejectAgreementSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const conversationIdParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const listMessagesQuerySchema = z
  .object({
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
    limit: z.preprocess(
      (value) => (value === '' || value === undefined ? 50 : value),
      z.coerce.number().int().min(1).max(100),
    ),
  })
  .strict();

export const agreementParamsSchema = z
  .object({
    id: objectIdSchema,
    agreementId: objectIdSchema,
  })
  .strict();
