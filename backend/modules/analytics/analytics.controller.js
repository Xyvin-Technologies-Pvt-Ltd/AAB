import { successResponse } from '../../helpers/response.js';
import * as analyticsService from './analytics.service.js';

export const getPackageProfitability = async (req, res, next) => {
  try {
    const filters = {
      packageId: req.query.packageId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const results = await analyticsService.getPackageProfitability(filters);
    return successResponse(res, 200, 'Package profitability retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getClientProfitability = async (req, res, next) => {
  try {
    const filters = {
      clientId: req.query.clientId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const results = await analyticsService.getClientProfitability(filters);
    return successResponse(res, 200, 'Client profitability retrieved successfully', results);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeUtilization = async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const results = await analyticsService.getEmployeeUtilization(filters);
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

