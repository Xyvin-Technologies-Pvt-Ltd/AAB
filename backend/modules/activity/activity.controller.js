import { successResponse } from '../../helpers/response.js';
import * as activityService from './activity.service.js';

export const createActivity = async (req, res, next) => {
  try {
    const activity = await activityService.createActivity(req.body);
    return successResponse(res, 201, 'Activity created successfully', activity);
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await activityService.getActivities(filters);
    return successResponse(res, 200, 'Activities retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getActivityById = async (req, res, next) => {
  try {
    const activity = await activityService.getActivityById(req.params.id);
    return successResponse(res, 200, 'Activity retrieved successfully', activity);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req, res, next) => {
  try {
    const activity = await activityService.updateActivity(req.params.id, req.body);
    return successResponse(res, 200, 'Activity updated successfully', activity);
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req, res, next) => {
  try {
    await activityService.deleteActivity(req.params.id);
    return successResponse(res, 200, 'Activity deleted successfully');
  } catch (error) {
    next(error);
  }
};

