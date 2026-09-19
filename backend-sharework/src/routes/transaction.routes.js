import { Router } from 'express';
import { listMyTransactions } from '../controllers/transaction.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/me', authenticate, listMyTransactions);

export default router;
