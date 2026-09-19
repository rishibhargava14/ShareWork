import { z } from 'zod';
import {
  GIG_PACKAGE_COUNT,
  GIG_PACKAGE_NAMES,
  GIG_PACKAGE_TIERS,
} from '../constants/gigPackages.js';
import { categoryNameSchema } from './categoryName.js';

const packageItemSchema = z
  .object({
    name: z.enum(GIG_PACKAGE_NAMES),
    description: z.string().trim().min(10).max(500),
    fixedPrice: z.coerce.number(),
    deliveryDays: z.coerce.number().int().min(1).max(90),
    revisions: z.coerce.number().int().min(0).max(20),
    features: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

export const packagesSchema = z
  .array(packageItemSchema)
  .length(GIG_PACKAGE_COUNT)
  .superRefine((packages, ctx) => {
    packages.forEach((item, index) => {
      if (item.name !== GIG_PACKAGE_NAMES[index]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'name'],
          message: 'Packages must be Basic, Standard, Premium in that order',
        });
      }

      if (GIG_PACKAGE_TIERS[item.name] !== item.fixedPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'fixedPrice'],
          message: `Package ${item.name} must cost ${GIG_PACKAGE_TIERS[item.name]}`,
        });
      }
    });
  });

const faqSchema = z
  .object({
    question: z.string().trim().min(1),
    answer: z.string().trim().min(1),
  })
  .strict();

export const createGigSchema = z
  .object({
    title: z.string().trim().min(10).max(120),
    category: categoryNameSchema,
    description: z.string().trim().min(100).max(3000),
    packages: packagesSchema,
    faqs: z.array(faqSchema).optional(),
    requirements: z.string().trim().max(1000).optional(),
  })
  .strict();

export const updateGigSchema = z
  .object({
    title: z.string().trim().min(10).max(120).optional(),
    category: categoryNameSchema.optional(),
    description: z.string().trim().min(100).max(3000).optional(),
    packages: packagesSchema.optional(),
    faqs: z.array(faqSchema).optional(),
    requirements: z.string().trim().max(1000).optional(),
    isActive: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((value) => value === true || value === 'true')
      .optional(),
  })
  .strict();
