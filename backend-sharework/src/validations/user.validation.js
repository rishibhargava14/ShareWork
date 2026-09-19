import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier');

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    avatar: z.string().trim().max(2048).optional(),
    bio: z.string().trim().max(1000).optional(),
    country: z.string().trim().min(2).max(56).optional(),
  })
  .strict();
