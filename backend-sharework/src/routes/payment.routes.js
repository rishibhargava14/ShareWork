import { Router } from 'express';
import { createOrder, verifyCheckout, verifyPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { validateBody } from '../middlewares/validate.js';
import { createOrderSchema, verifyCheckoutSchema } from '../validations/payment.validation.js';

const router = Router();

router.post('/create-order', authenticate, role('customer'), validateBody(createOrderSchema), createOrder);
router.post(
  '/verify-checkout',
  authenticate,
  role('customer'),
  validateBody(verifyCheckoutSchema),
  verifyCheckout,
);
router.post('/verify', verifyPayment);

export default router;
