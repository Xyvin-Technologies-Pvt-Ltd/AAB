import { successResponse } from '../../helpers/response.js';
import * as packageService from './package.service.js';
import { parsePage, parseLimit } from '../../helpers/pagination.js';
import { invalidateTags } from '../../helpers/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';

const PACKAGE_TAGS = [CACHE_TAGS.PACKAGES, CACHE_TAGS.CLIENTS, CACHE_TAGS.ANALYTICS];

export const createPackage = async (req, res, next) => {
  try {
    const packageDoc = await packageService.createPackage(req.body);
    await invalidateTags(PACKAGE_TAGS);
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
      page: parsePage(req.query.page),
      // Package documents carry no large embedded blobs, and several picker
      // views (Tasks, TimeTracker) fetch the full set for a client's packages.
      limit: parseLimit(req.query.limit, 10, 2000),
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
    await invalidateTags(PACKAGE_TAGS);
    return successResponse(res, 200, 'Package updated successfully', packageDoc);
  } catch (error) {
    next(error);
  }
};

export const deletePackage = async (req, res, next) => {
  try {
    await packageService.deletePackage(req.params.id);
    await invalidateTags(PACKAGE_TAGS);
    return successResponse(res, 200, 'Package deleted successfully');
  } catch (error) {
    next(error);
  }
};
