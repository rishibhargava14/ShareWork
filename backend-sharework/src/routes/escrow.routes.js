import { Router } from 'express';
import { releaseEscrow } from '../controllers/escrow.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { validateBody } from '../middlewares/validate.js';
import { releaseEscrowSchema } from '../validations/payment.validation.js';

const router = Router();

router.post('/release', authenticate, role('customer'), validateBody(releaseEscrowSchema), releaseEscrow);

export default router;
