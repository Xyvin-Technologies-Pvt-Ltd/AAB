import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as notificationController from './notification.controller.js';

const router = express.Router();

router.use(authenticate);

// scopeByUser is required here - notifications are per-user data and must
// never be served from another user's cached response.
router.get(
  '/',
  cacheRoute([CACHE_TAGS.NOTIFICATIONS], { ttl: 15, scopeByUser: true }),
  notificationController.getNotifications
);
router.get(
  '/unread-count',
  cacheRoute([CACHE_TAGS.NOTIFICATIONS], { ttl: 10, scopeByUser: true }),
  notificationController.getUnreadCount
);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
