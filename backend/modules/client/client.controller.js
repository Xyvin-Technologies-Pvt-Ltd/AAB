import { successResponse } from '../../helpers/response.js';
import * as clientService from './client.service.js';

export const createClient = async (req, res, next) => {
  try {
    const client = await clientService.createClient(req.body);
    return successResponse(res, 201, 'Client created successfully', client);
  } catch (error) {
    next(error);
  }
};

export const getClients = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await clientService.getClients(filters);
    return successResponse(res, 200, 'Clients retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    return successResponse(res, 200, 'Client retrieved successfully', client);
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    return successResponse(res, 200, 'Client updated successfully', client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    await clientService.deleteClient(req.params.id);
    return successResponse(res, 200, 'Client deleted successfully');
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
    const fileData = await uploadFile(req.file, 'clients');

    const documentData = {
      name: fileData.name,
      url: fileData.url,
      key: fileData.key,
      uploadedAt: new Date(),
    };

    const client = await clientService.addDocument(req.params.id, documentData);
    return successResponse(res, 200, 'Document uploaded successfully', client);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { client, document } = await clientService.removeDocument(
      req.params.id,
      req.params.documentId
    );

    // Delete from S3
    const { deleteFile } = await import('../../helpers/s3Storage.js');
    await deleteFile(document.key);

    return successResponse(res, 200, 'Document deleted successfully', client);
  } catch (error) {
    next(error);
  }
};

