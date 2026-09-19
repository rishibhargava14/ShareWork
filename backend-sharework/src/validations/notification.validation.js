import { z } from 'zod';
import { objectIdSchema } from './user.validation.js';

export const listNotificationsQuerySchema = z
  .object({
    page: z.preprocess(
      (value) => (value === '' || value === undefined ? 1 : value),
      z.coerce.number().int().min(1),
    ),
  })
  .strict();

export const notificationIdParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();
