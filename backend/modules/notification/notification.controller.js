import { successResponse } from '../../helpers/response.js';
import * as notificationService from './notification.service.js';
import { parsePage, parseLimit } from '../../helpers/pagination.js';
import { invalidateTags } from '../../helpers/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await notificationService.getNotifications(req.user._id, {
      page: parsePage(page),
      limit: parseLimit(limit, 20),
    });
    return successResponse(res, 200, 'Notifications retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    return successResponse(res, 200, 'Unread count retrieved', { count });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    await invalidateTags([CACHE_TAGS.NOTIFICATIONS]);
    return successResponse(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    await invalidateTags([CACHE_TAGS.NOTIFICATIONS]);
    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
