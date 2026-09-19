import Notification from '../models/Notification.js';
import { DISCOVERY_PAGE_SIZE } from '../constants/pagination.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';

export const toSafeNotification = (notification) => ({
  id: String(notification._id),
  userId: String(notification.userId),
  type: notification.type ?? 'system',
  title: notification.title ?? '',
  message: notification.message ?? '',
  link: notification.link ?? '',
  isRead: Boolean(notification.isRead),
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

export const notifyUser = async ({ userId, type, title, message, link }) => {
  if (!userId) {
    return null;
  }

  return Notification.create({
    userId,
    type,
    title,
    message,
    link,
    isRead: false,
  });
};

export const notifyUsers = async (userIds, payload) => {
  const unique = [...new Set((userIds ?? []).filter(Boolean).map((id) => String(id)))];
  await Promise.all(unique.map((userId) => notifyUser({ userId, ...payload })));
};

export const listNotifications = async (userId, { page = 1 } = {}) => {
  const skip = (page - 1) * DISCOVERY_PAGE_SIZE;
  const filter = { userId };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(DISCOVERY_PAGE_SIZE).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    notifications: notifications.map(toSafeNotification),
    total,
    unreadCount,
    page,
  };
};

export const getUnreadCount = async (userId) => {
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  return { unreadCount };
};

export const markNotificationRead = async (userId, notificationId) => {
  const notification = await Notification.findById(notificationId);

  if (!notification) {
    throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(notification.userId) !== String(userId)) {
    throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  return { notification: toSafeNotification(notification) };
};

export const markAllNotificationsRead = async (userId) => {
  const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  return { updated: result.modifiedCount ?? 0 };
};
