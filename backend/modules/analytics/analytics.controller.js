import { successResponse, errorResponse } from '../../helpers/response.js';
import * as analyticsService from './analytics.service.js';
import { checkResourceAccess, getUserAccessibleEmployeeIds } from '../../middlewares/rbac.js';

export const getPackageProfitability = async (req, res, next) => {
  try {
    // Check if user has access to analytics
    if (!checkResourceAccess(req.user, 'analytics', 'view')) {
      return errorResponse(res, 403, 'Access denied. You do not have permission to view analytics.');
    }

    const viewMode = req.query.viewMode;
    const filters = {
      packageId: req.query.packageId,
      clientId: req.query.clientId,
      employeeId: req.query.employeeId,
      packageType: req.query.packageType,
      billingFrequency: req.query.billingFrequency,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    };

    // ADMIN with viewMode=my: restrict to own data
    if (req.user.role === 'ADMIN' && viewMode === 'my' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }
    // Apply team filtering for MANAGER role
    if (req.user.role === 'MANAGER') {
      filters._accessibleEmployeeIds = await getUserAccessibleEmployeeIds(req.user);
    }

    const results = await analyticsService.getPackageProfitability(filters, req.user);
    return successResponse(res, 200, 'Package profitability retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getClientProfitability = async (req, res, next) => {
  try {
    // Check if user has access to analytics
    if (!checkResourceAccess(req.user, 'analytics', 'view')) {
      return errorResponse(res, 403, 'Access denied. You do not have permission to view analytics.');
    }

    const viewMode = req.query.viewMode;
    const filters = {
      clientId: req.query.clientId,
      employeeId: req.query.employeeId,
      packageType: req.query.packageType,
      billingFrequency: req.query.billingFrequency,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    };

    // ADMIN with viewMode=my: restrict to own data
    if (req.user.role === 'ADMIN' && viewMode === 'my' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }
    // Apply team filtering for MANAGER role
    if (req.user.role === 'MANAGER') {
      filters._accessibleEmployeeIds = await getUserAccessibleEmployeeIds(req.user);
    }

    const results = await analyticsService.getClientProfitability(filters, req.user);
    return successResponse(res, 200, 'Client profitability retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeUtilization = async (req, res, next) => {
  try {
    // Check if user has access to analytics
    if (!checkResourceAccess(req.user, 'analytics', 'view')) {
      return errorResponse(res, 403, 'Access denied. You do not have permission to view analytics.');
    }

    const viewMode = req.query.viewMode;
    const filters = {
      clientId: req.query.clientId,
      packageId: req.query.packageId,
      employeeId: req.query.employeeId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    };

    // ADMIN with viewMode=my: restrict to own data
    if (req.user.role === 'ADMIN' && viewMode === 'my' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }
    // Apply team filtering for MANAGER role
    if (req.user.role === 'MANAGER') {
      filters._accessibleEmployeeIds = await getUserAccessibleEmployeeIds(req.user);
    }

    const results = await analyticsService.getEmployeeUtilization(filters, req.user);
    return successResponse(res, 200, 'Employee utilization retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getClientDashboard = async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const results = await analyticsService.getClientDashboard(req.params.id, filters);
    return successResponse(res, 200, 'Client dashboard data retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getDashboardStatistics = async (req, res, next) => {
  try {
    const results = await analyticsService.getDashboardStatistics();
    return successResponse(res, 200, 'Dashboard statistics retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getPackageAnalytics = async (req, res, next) => {
  try {
    if (!checkResourceAccess(req.user, 'analytics', 'view')) {
      return errorResponse(res, 403, 'Access denied. You do not have permission to view analytics.');
    }

    const viewMode = req.query.viewMode;
    const filters = {
      employeeId: req.query.employeeId,
      taskId: req.query.taskId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    // ADMIN with viewMode=my: restrict to own data
    if (req.user.role === 'ADMIN' && viewMode === 'my' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }
    if (req.user.role === 'MANAGER') {
      filters._accessibleEmployeeIds = await getUserAccessibleEmployeeIds(req.user);
    }

    const results = await analyticsService.getPackageAnalytics(req.params.id, filters, req.user);
    return successResponse(res, 200, 'Package analytics retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getClientAnalytics = async (req, res, next) => {
  try {
    if (!checkResourceAccess(req.user, 'analytics', 'view')) {
      return errorResponse(res, 403, 'Access denied. You do not have permission to view analytics.');
    }

    const viewMode = req.query.viewMode;
    const filters = {
      employeeId: req.query.employeeId,
      packageId: req.query.packageId,
      packageType: req.query.packageType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    // ADMIN with viewMode=my: restrict to own data
    if (req.user.role === 'ADMIN' && viewMode === 'my' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }
    if (req.user.role === 'MANAGER') {
      filters._accessibleEmployeeIds = await getUserAccessibleEmployeeIds(req.user);
    }

    const results = await analyticsService.getClientAnalytics(req.params.id, filters, req.user);
    return successResponse(res, 200, 'Client analytics retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeAnalytics = async (req, res, next) => {
  try {
    if (!checkResourceAccess(req.user, 'analytics', 'view')) {
      return errorResponse(res, 403, 'Access denied. You do not have permission to view analytics.');
    }

    const viewMode = req.query.viewMode;
    const filters = {
      clientId: req.query.clientId,
      packageId: req.query.packageId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    // ADMIN with viewMode=my: restrict to own data
    if (req.user.role === 'ADMIN' && viewMode === 'my' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }
    if (req.user.role === 'MANAGER') {
      filters._accessibleEmployeeIds = await getUserAccessibleEmployeeIds(req.user);
    }

    const results = await analyticsService.getEmployeeAnalytics(req.params.id, filters, req.user);
    return successResponse(res, 200, 'Employee analytics retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

