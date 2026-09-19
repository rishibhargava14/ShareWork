import { Router } from 'express';
import { discover } from '../controllers/customer.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { validateQuery } from '../middlewares/validate.js';
import { discoverQuerySchema } from '../validations/customer.validation.js';

const router = Router();

router.get('/discover', authenticate, role('customer'), validateQuery(discoverQuerySchema), discover);

export default router;
