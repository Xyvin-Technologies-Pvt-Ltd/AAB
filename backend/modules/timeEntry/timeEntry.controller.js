import { successResponse } from '../../helpers/response.js';
import * as timeEntryService from './timeEntry.service.js';

export const createTimeEntry = async (req, res, next) => {
  try {
    const timeEntry = await timeEntryService.createTimeEntry(
      req.body,
      req.user.id,
      req.user.role
    );
    return successResponse(res, 201, 'Time entry created successfully', timeEntry);
  } catch (error) {
    next(error);
  }
};

export const getTimeEntries = async (req, res, next) => {
  try {
    const filters = {
      employeeId: req.query.employeeId,
      clientId: req.query.clientId,
      packageId: req.query.packageId,
      taskId: req.query.taskId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    // If user is EMPLOYEE, filter to only their time entries
    if (req.user.role === 'EMPLOYEE' && req.user.employeeId) {
      filters.employeeId = req.user.employeeId.toString();
    }

    const result = await timeEntryService.getTimeEntries(filters);
    return successResponse(res, 200, 'Time entries retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getTimeEntryById = async (req, res, next) => {
  try {
    const timeEntry = await timeEntryService.getTimeEntryById(req.params.id);
    return successResponse(res, 200, 'Time entry retrieved successfully', timeEntry);
  } catch (error) {
    next(error);
  }
};

export const updateTimeEntry = async (req, res, next) => {
  try {
    const timeEntry = await timeEntryService.updateTimeEntry(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );
    return successResponse(res, 200, 'Time entry updated successfully', timeEntry);
  } catch (error) {
    next(error);
  }
};

export const deleteTimeEntry = async (req, res, next) => {
  try {
    await timeEntryService.deleteTimeEntry(req.params.id, req.user.id, req.user.role);
    return successResponse(res, 200, 'Time entry deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const startTimer = async (req, res, next) => {
  try {
    const timer = await timeEntryService.startTimer(
      req.body,
      req.user._id,
      req.user.role
    );
    return successResponse(res, 201, 'Timer started successfully', timer);
  } catch (error) {
    next(error);
  }
};

export const stopTimer = async (req, res, next) => {
  try {
    const timer = await timeEntryService.stopTimer(
      req.params.id,
      req.user._id,
      req.user.role
    );
    return successResponse(res, 200, 'Timer stopped successfully', timer);
  } catch (error) {
    next(error);
  }
};

export const getRunningTimer = async (req, res, next) => {
  try {
    // If user is EMPLOYEE, get their own running timer
    let employeeId = req.query.employeeId;
    if (req.user.role === 'EMPLOYEE' && req.user.employeeId) {
      employeeId = req.user.employeeId.toString();
    }

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    const timer = await timeEntryService.getRunningTimer(employeeId);
    return successResponse(res, 200, 'Running timer retrieved successfully', timer || null);
  } catch (error) {
    next(error);
  }
};

