import { successResponse } from '../../helpers/response.js';
import * as activityService from './activity.service.js';
import { parsePage, parseLimit } from '../../helpers/pagination.js';
import { invalidateTags } from '../../helpers/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';

export const createActivity = async (req, res, next) => {
  try {
    const activity = await activityService.createActivity(req.body);
    await invalidateTags([CACHE_TAGS.ACTIVITIES]);
    return successResponse(res, 201, 'Activity created successfully', activity);
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      page: parsePage(req.query.page),
      // Reference data; pickers fetch the full list.
      limit: parseLimit(req.query.limit, 10, 2000),
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
    await invalidateTags([CACHE_TAGS.ACTIVITIES]);
    return successResponse(res, 200, 'Activity updated successfully', activity);
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req, res, next) => {
  try {
    await activityService.deleteActivity(req.params.id);
    await invalidateTags([CACHE_TAGS.ACTIVITIES]);
    return successResponse(res, 200, 'Activity deleted successfully');
  } catch (error) {
    next(error);
  }
};
