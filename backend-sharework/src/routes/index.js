import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import conversationRoutes from './conversation.routes.js';
import customerRoutes from './customer.routes.js';
import escrowRoutes from './escrow.routes.js';
import fileRoutes from './file.routes.js';
import gigRoutes from './gig.routes.js';
import notificationRoutes from './notification.routes.js';
import paymentRoutes from './payment.routes.js';
import projectRoutes from './project.routes.js';
import providerRoutes, { providerAccountRouter } from './provider.routes.js';
import requirementRoutes from './requirement.routes.js';
import transactionRoutes from './transaction.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/customer', requirementRoutes);
router.use('/providers', providerRoutes);
router.use('/provider', providerAccountRouter);
router.use('/gigs', gigRoutes);
router.use('/conversations', conversationRoutes);
router.use('/projects', projectRoutes);
router.use('/payments', paymentRoutes);
router.use('/transactions', transactionRoutes);
router.use('/escrow', escrowRoutes);
router.use('/files', fileRoutes);
router.use('/categories', categoryRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
