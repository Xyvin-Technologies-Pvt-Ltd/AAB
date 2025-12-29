import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import * as analyticsController from './analytics.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Read-only analytics endpoints
router.get('/packages', analyticsController.getPackageProfitability);
router.get('/clients', analyticsController.getClientProfitability);
router.get('/employees', analyticsController.getEmployeeUtilization);
router.get('/client/:id/dashboard', analyticsController.getClientDashboard);
router.get('/dashboard-statistics', analyticsController.getDashboardStatistics);
router.get('/package/:id', analyticsController.getPackageAnalytics);
router.get('/client/:id', analyticsController.getClientAnalytics);
router.get('/employee/:id', analyticsController.getEmployeeAnalytics);

export default router;

