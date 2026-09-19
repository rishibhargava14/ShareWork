import { Router } from 'express';
import { createRequirement, listRequirements } from '../controllers/requirement.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { validateBody } from '../middlewares/validate.js';
import { createRequirementSchema } from '../validations/requirement.validation.js';

const router = Router();

router.use(authenticate, role('customer'));

router.post('/requirements', validateBody(createRequirementSchema), createRequirement);
router.get('/requirements', listRequirements);

export default router;
