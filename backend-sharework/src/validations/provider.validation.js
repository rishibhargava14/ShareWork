import { z } from 'zod';
import { ONLINE_STATUSES, WEEKLY_DAYS } from '../constants/schemaEnums.js';

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

const weeklyDaySchema = z
  .object({
    day: z.enum(WEEKLY_DAYS),
    enabled: z.boolean(),
    start: timeSchema.optional(),
    end: timeSchema.optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.enabled && (!item.start || !item.end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['start'],
        message: 'Enabled days require start and end',
      });
    }
  });

const vacationModeSchema = z
  .object({
    enabled: z.boolean(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.enabled && (!item.startDate || !item.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'Enabled vacation mode requires startDate and endDate',
      });
    }

    if (item.startDate && item.endDate && item.startDate > item.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'vacation startDate cannot be after endDate',
      });
    }
  });

export const providerAvailabilitySchema = z
  .object({
    weeklySchedule: z.array(weeklyDaySchema),
    vacationMode: vacationModeSchema,
  })
  .strict();

export const providerOnlineStatusSchema = z
  .object({
    onlineStatus: z.enum(ONLINE_STATUSES),
  })
  .strict();

export const providerWithdrawalSchema = z
  .object({
    amount: z.coerce.number().positive().finite(),
    upiId: z
      .string()
      .trim()
      .min(3)
      .regex(/^\S+@\S+$/, 'Invalid UPI ID'),
  })
  .strict();
