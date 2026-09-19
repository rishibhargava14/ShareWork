import { Router } from 'express';
import {
  approveDeliverable,
  createDispute,
  createReview,
  fundProject,
  getProject,
  listProjects,
  requestRevision,
  submitDeliverable,
} from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { uploadDeliverableFiles } from '../middlewares/upload.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  createDisputeSchema,
  createReviewSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  requestRevisionSchema,
  submitDeliverableSchema,
} from '../validations/project.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listProjectsQuerySchema), listProjects);
router.get('/:id', validateParams(projectIdParamSchema), getProject);
router.post(
  '/:id/fund-escrow',
  validateParams(projectIdParamSchema),
  role('customer'),
  fundProject,
);
router.post(
  '/:id/submit-deliverable',
  validateParams(projectIdParamSchema),
  role('provider'),
  uploadDeliverableFiles,
  validateBody(submitDeliverableSchema),
  submitDeliverable,
);
router.post(
  '/:id/approve-deliverable',
  validateParams(projectIdParamSchema),
  role('customer'),
  approveDeliverable,
);
router.post(
  '/:id/request-revision',
  validateParams(projectIdParamSchema),
  role('customer'),
  validateBody(requestRevisionSchema),
  requestRevision,
);
router.post(
  '/:id/dispute',
  validateParams(projectIdParamSchema),
  validateBody(createDisputeSchema),
  createDispute,
);
router.post(
  '/:id/review',
  validateParams(projectIdParamSchema),
  role('customer'),
  validateBody(createReviewSchema),
  createReview,
);

export default router;
