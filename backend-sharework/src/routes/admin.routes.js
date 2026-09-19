import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  forceReleaseProject,
  getProject,
  getSettings,
  getStats,
  getUser,
  listAuditLogs,
  listCategories,
  listDisputes,
  listEscrows,
  listLeakageLogs,
  listProjects,
  listTransactions,
  listUsers,
  listWithdrawals,
  resolveDispute,
  setUserBanStatus,
  updateCategory,
  updateSettings,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  adminIdParamSchema,
  banUserSchema,
  createCategorySchema,
  listAdminAuditQuerySchema,
  listAdminDisputesQuerySchema,
  listAdminProjectsQuerySchema,
  listAdminTransactionsQuerySchema,
  listAdminUsersQuerySchema,
  listAdminWithdrawalsQuerySchema,
  resolveDisputeSchema,
  updateAdminSettingsSchema,
  updateCategorySchema,
} from '../validations/admin.validation.js';

const router = Router();

router.use(authenticate, role('admin'));

router.get('/stats', getStats);
router.get('/users', validateQuery(listAdminUsersQuerySchema), listUsers);
router.get('/users/:id', validateParams(adminIdParamSchema), getUser);
router.get('/projects', validateQuery(listAdminProjectsQuerySchema), listProjects);
router.get('/projects/:id', validateParams(adminIdParamSchema), getProject);
router.post(
  '/projects/:id/force-release',
  validateParams(adminIdParamSchema),
  forceReleaseProject,
);
router.get('/escrows', listEscrows);
router.get('/transactions', validateQuery(listAdminTransactionsQuerySchema), listTransactions);
router.get('/withdrawals', validateQuery(listAdminWithdrawalsQuerySchema), listWithdrawals);
router.get('/leakage-logs', listLeakageLogs);
router.get('/disputes', validateQuery(listAdminDisputesQuerySchema), listDisputes);
router.get('/categories', listCategories);
router.post('/categories', validateBody(createCategorySchema), createCategory);
router.put(
  '/categories/:id',
  validateParams(adminIdParamSchema),
  validateBody(updateCategorySchema),
  updateCategory,
);
router.delete('/categories/:id', validateParams(adminIdParamSchema), deleteCategory);
router.get('/settings', getSettings);
router.put('/settings', validateBody(updateAdminSettingsSchema), updateSettings);
router.get('/audit-logs', validateQuery(listAdminAuditQuerySchema), listAuditLogs);
router.post(
  '/disputes/:id/resolve',
  validateParams(adminIdParamSchema),
  validateBody(resolveDisputeSchema),
  resolveDispute,
);
router.put(
  '/users/:id/ban',
  validateParams(adminIdParamSchema),
  validateBody(banUserSchema),
  setUserBanStatus,
);

export default router;
