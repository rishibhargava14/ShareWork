import { Router } from 'express';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateParams, validateQuery } from '../middlewares/validate.js';
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../validations/notification.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(listNotificationsQuerySchema), listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', validateParams(notificationIdParamSchema), markNotificationRead);

export default router;
