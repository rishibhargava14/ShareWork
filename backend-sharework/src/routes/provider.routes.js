import { Router } from 'express';
import {
  getDashboardStats,
  getEarnings,
  listGigs,
  requestWithdrawal,
  toggleOnlineStatus,
  updateAvailability,
} from '../controllers/provider.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import {
  providerAvailabilitySchema,
  providerOnlineStatusSchema,
  providerWithdrawalSchema,
} from '../validations/provider.validation.js';
import { idParamSchema } from '../validations/user.validation.js';

const router = Router();

router.get('/:id/gigs', authenticate, validateParams(idParamSchema), listGigs);

export const providerAccountRouter = Router();

providerAccountRouter.use(authenticate, role('provider'));
providerAccountRouter.get('/dashboard/stats', getDashboardStats);
providerAccountRouter.get('/earnings', getEarnings);
providerAccountRouter.post(
  '/availability',
  validateBody(providerAvailabilitySchema),
  updateAvailability,
);
providerAccountRouter.put(
  '/availability/toggle-online',
  validateBody(providerOnlineStatusSchema),
  toggleOnlineStatus,
);
providerAccountRouter.post(
  '/withdraw',
  validateBody(providerWithdrawalSchema),
  requestWithdrawal,
);

export default router;
