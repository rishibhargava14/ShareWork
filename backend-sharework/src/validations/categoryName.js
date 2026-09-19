import { z } from 'zod';

export const categoryNameSchema = z.string().trim().min(1).max(40);
