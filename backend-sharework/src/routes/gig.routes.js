import { Router } from 'express';
import { createGig, getGig, updateGig } from '../controllers/gig.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { parseGigBody } from '../middlewares/parseGigBody.js';
import { role } from '../middlewares/role.js';
import { uploadPortfolioImages } from '../middlewares/upload.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { createGigSchema, updateGigSchema } from '../validations/gig.validation.js';
import { idParamSchema } from '../validations/user.validation.js';

const router = Router();

router.post(
  '/',
  authenticate,
  role('provider'),
  uploadPortfolioImages,
  parseGigBody,
  validateBody(createGigSchema),
  createGig,
);

router.put(
  '/:id',
  authenticate,
  role('provider'),
  validateParams(idParamSchema),
  uploadPortfolioImages,
  parseGigBody,
  validateBody(updateGigSchema),
  updateGig,
);

router.get('/:id', validateParams(idParamSchema), getGig);

export default router;
