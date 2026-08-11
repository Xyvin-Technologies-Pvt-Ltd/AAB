import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as analyticsController from './analytics.controller.js';

const router = express.Router();

// All routes require authentication; authorization handled at controller level based on role and viewMode
router.use(authenticate);

// Every mutating controller across the app invalidates CACHE_TAGS.ANALYTICS,
// so these heavy aggregation endpoints only need to key off that one tag.
// scopeByUser is on because "viewMode=my" / MANAGER team-filtering shapes the
// response per-user in the controller, before any query even reaches here.
const analyticsCache = { ttl: 60, scopeByUser: true };

// Read-only analytics endpoints
router.get('/packages', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getPackageProfitability);
router.get('/clients', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getClientProfitability);
router.get('/employees', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getEmployeeUtilization);
router.get('/client/:id/dashboard', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getClientDashboard);
router.get('/dashboard-statistics', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getDashboardStatistics);
router.get('/package/:id', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getPackageAnalytics);
router.get('/client/:id', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getClientAnalytics);
router.get('/employee/:id', cacheRoute([CACHE_TAGS.ANALYTICS], analyticsCache), analyticsController.getEmployeeAnalytics);

export default router;

