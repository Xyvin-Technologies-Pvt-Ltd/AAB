import { successResponse } from '../../helpers/response.js';
import * as serviceService from './service.service.js';

export const createService = async (req, res, next) => {
  try {
    const service = await serviceService.createService(req.body);
    return successResponse(res, 201, 'Service created successfully', service);
  } catch (error) {
    next(error);
  }
};

export const getServices = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await serviceService.getServices(filters);
    return successResponse(res, 200, 'Services retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (req, res, next) => {
  try {
    const service = await serviceService.getServiceById(req.params.id);
    return successResponse(res, 200, 'Service retrieved successfully', service);
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const service = await serviceService.updateService(req.params.id, req.body);
    return successResponse(res, 200, 'Service updated successfully', service);
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    await serviceService.deleteService(req.params.id);
    return successResponse(res, 200, 'Service deleted successfully');
  } catch (error) {
    next(error);
  }
};

