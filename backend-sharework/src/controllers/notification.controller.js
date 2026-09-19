import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markNotificationRead(req.user.id, req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
