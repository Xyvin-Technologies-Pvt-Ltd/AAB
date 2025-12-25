import { successResponse } from '../../helpers/response.js';
import * as employeeService from './employee.service.js';

export const createEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.createEmployee(req.body);
    return successResponse(res, 201, 'Employee created successfully', employee);
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      isActive: req.query.isActive,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await employeeService.getEmployees(filters);
    return successResponse(res, 200, 'Employees retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    return successResponse(res, 200, 'Employee retrieved successfully', employee);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    return successResponse(res, 200, 'Employee updated successfully', employee);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    await employeeService.deleteEmployee(req.params.id);
    return successResponse(res, 200, 'Employee deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { uploadFile } = await import('../../helpers/s3Storage.js');
    const fileData = await uploadFile(req.file, 'employees');

    const documentData = {
      name: fileData.name,
      url: fileData.url,
      key: fileData.key,
      uploadedAt: new Date(),
    };

    const employee = await employeeService.addDocument(req.params.id, documentData);
    return successResponse(res, 200, 'Document uploaded successfully', employee);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { employee, document } = await employeeService.removeDocument(
      req.params.id,
      req.params.documentId
    );

    // Delete from S3
    const { deleteFile } = await import('../../helpers/s3Storage.js');
    await deleteFile(document.key);

    return successResponse(res, 200, 'Document deleted successfully', employee);
  } catch (error) {
    next(error);
  }
};

