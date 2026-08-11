import Notification from './notification.model.js';
import { invalidateTags } from '../../helpers/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';

// Creation also happens outside the controller layer (scheduler.js cron
// jobs), so invalidation lives here rather than in notification.controller.js
// to cover every caller in one place.
export const createNotification = async ({ userId, type, title, message, data = {} }) => {
  const notification = await Notification.create({ userId, type, title, message, data });
  await invalidateTags([CACHE_TAGS.NOTIFICATIONS]);
  return notification;
};

export const createNotificationsForUsers = async (userIds, payload) => {
  const notifications = userIds.map((userId) => ({ ...payload, userId }));
  if (notifications.length === 0) return [];
  const created = await Notification.insertMany(notifications);
  await invalidateTags([CACHE_TAGS.NOTIFICATIONS]);
  return created;
};

export const getNotifications = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, unreadCount };
};

export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, read: false });
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  );
  if (!notification) throw new Error('Notification not found');
  return notification;
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany({ userId, read: false }, { read: true });
  return { success: true };
};

export const notifyTaskAssigned = async (task, assigneeUserIds, performedByName) => {
  if (!assigneeUserIds || assigneeUserIds.length === 0) return;
  return createNotificationsForUsers(assigneeUserIds, {
    type: 'TASK_ASSIGNED',
    title: 'You were assigned a task',
    message: `${performedByName || 'Someone'} assigned you to "${task.name}"`,
    data: {
      taskId: task._id,
      taskName: task.name,
      clientName: task.clientId?.name || '',
    },
  });
};

export const notifyCommentAdded = async (task, assigneeUserIds, commenterName) => {
  if (!assigneeUserIds || assigneeUserIds.length === 0) return;
  return createNotificationsForUsers(assigneeUserIds, {
    type: 'COMMENT_ADDED',
    title: 'New comment on your task',
    message: `${commenterName || 'Someone'} commented on "${task.name}"`,
    data: {
      taskId: task._id,
      taskName: task.name,
      clientName: task.clientId?.name || '',
    },
  });
};
