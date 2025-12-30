import { successResponse } from '../../helpers/response.js';
import * as taskService from './task.service.js';

export const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body, req.user._id);
    return successResponse(res, 201, 'Task created successfully', task);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const filters = {
      clientId: req.query.clientId,
      packageId: req.query.packageId,
      status: req.query.status,
      assignedTo: req.query.assignedTo,
      priority: req.query.priority,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await taskService.getTasks(filters);
    return successResponse(res, 200, 'Tasks retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id);
    return successResponse(res, 200, 'Task retrieved successfully', task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.body);
    return successResponse(res, 200, 'Task updated successfully', task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id);
    return successResponse(res, 200, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const updateTaskOrder = async (req, res, next) => {
  try {
    const { order } = req.body;
    const task = await taskService.updateTaskOrder(req.params.id, order);
    return successResponse(res, 200, 'Task order updated successfully', task);
  } catch (error) {
    next(error);
  }
};

export const getCalendarTasks = async (req, res, next) => {
  try {
    const { start, end, clientId } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required',
      });
    }

    const tasks = await taskService.getCalendarTasks(start, end, clientId);
    return successResponse(res, 200, 'Calendar tasks retrieved successfully', { tasks });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required',
      });
    }

    const task = await taskService.addComment(req.params.id, { content }, req.user._id);
    return successResponse(res, 200, 'Comment added successfully', task);
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  try {
    const task = await taskService.deleteComment(
      req.params.id,
      req.params.commentId,
      req.user._id
    );
    return successResponse(res, 200, 'Comment deleted successfully', task);
  } catch (error) {
    next(error);
  }
};

export const addAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
      });
    }

    const { uploadFile } = await import('../../helpers/s3Storage.js');
    const fileData = await uploadFile(req.file, 'tasks');

    const task = await taskService.addAttachment(req.params.id, fileData, req.user._id);
    return successResponse(res, 200, 'Attachment uploaded successfully', task);
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const task = await taskService.deleteAttachment(
      req.params.id,
      req.params.attachmentId,
      req.user._id
    );
    return successResponse(res, 200, 'Attachment deleted successfully', task);
  } catch (error) {
    next(error);
  }
};

