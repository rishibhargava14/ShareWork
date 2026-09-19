import { z } from 'zod';
import { categoryNameSchema } from './categoryName.js';

export const createRequirementSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(3000),
    category: categoryNameSchema,
    budget: z.coerce.number().min(0).max(10_000_000),
    deadline: z.coerce.date().refine((value) => value.getTime() > Date.now(), {
      message: 'deadline must be in the future',
    }),
    skills: z.array(z.string().trim().min(1).max(40)).min(1).max(20),
  })
  .strict();
