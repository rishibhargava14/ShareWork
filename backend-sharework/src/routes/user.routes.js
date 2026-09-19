import { Router } from 'express';
import { getMe, getProfile, updateMe } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { idParamSchema, updateMeSchema } from '../validations/user.validation.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, validateBody(updateMeSchema), updateMe);
router.get('/:id/profile', authenticate, validateParams(idParamSchema), getProfile);

export default router;
