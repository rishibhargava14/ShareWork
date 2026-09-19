import { z } from 'zod';
import { ONLINE_STATUSES } from '../constants/schemaEnums.js';
import { categoryNameSchema } from './categoryName.js';

const emptyToUndefined = (value) => (value === '' || value === undefined ? undefined : value);

export const discoverQuerySchema = z
  .object({
    category: z.preprocess(emptyToUndefined, categoryNameSchema.optional()),
    budgetMin: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
    budgetMax: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
    rating: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(5).optional()),
    online: z.preprocess(emptyToUndefined, z.enum(ONLINE_STATUSES).optional()),
    search: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(80).optional()),
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
  })
  .strict()
  .refine(
    (query) =>
      query.budgetMin === undefined ||
      query.budgetMax === undefined ||
      query.budgetMin <= query.budgetMax,
    { message: 'budgetMin cannot be greater than budgetMax', path: ['budgetMin'] },
  );
