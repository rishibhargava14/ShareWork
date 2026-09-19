import { z } from 'zod';
import { objectIdSchema } from './user.validation.js';

export const createOrderSchema = z
  .object({
    projectId: objectIdSchema,
  })
  .strict();

export const releaseEscrowSchema = z
  .object({
    projectId: objectIdSchema,
  })
  .strict();

export const verifyCheckoutSchema = z
  .object({
    projectId: objectIdSchema,
    razorpay_order_id: z.string().trim().min(1).max(80),
    razorpay_payment_id: z.string().trim().min(1).max(80),
    razorpay_signature: z.string().trim().min(10).max(256),
  })
  .strict();
