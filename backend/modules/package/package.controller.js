import { successResponse } from '../../helpers/response.js';
import * as packageService from './package.service.js';

export const createPackage = async (req, res, next) => {
  try {
    const packageDoc = await packageService.createPackage(req.body);
    return successResponse(res, 201, 'Package created successfully', packageDoc);
  } catch (error) {
    next(error);
  }
};

export const getPackages = async (req, res, next) => {
  try {
    const filters = {
      clientId: req.query.clientId,
      type: req.query.type,
      status: req.query.status,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await packageService.getPackages(filters);
    return successResponse(res, 200, 'Packages retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getPackageById = async (req, res, next) => {
  try {
    const packageDoc = await packageService.getPackageById(req.params.id);
    return successResponse(res, 200, 'Package retrieved successfully', packageDoc);
  } catch (error) {
    next(error);
  }
};

export const updatePackage = async (req, res, next) => {
  try {
    const packageDoc = await packageService.updatePackage(req.params.id, req.body);
    return successResponse(res, 200, 'Package updated successfully', packageDoc);
  } catch (error) {
    next(error);
  }
};

export const deletePackage = async (req, res, next) => {
  try {
    await packageService.deletePackage(req.params.id);
    return successResponse(res, 200, 'Package deleted successfully');
  } catch (error) {
    next(error);
  }
};

