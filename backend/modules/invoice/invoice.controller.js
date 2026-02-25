import { successResponse } from '../../helpers/response.js';
import * as invoiceService from './invoice.service.js';

export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body, req.user._id);
    return successResponse(res, 201, 'Invoice created successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const filters = {
      clientId: req.query.clientId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };
    const result = await invoiceService.getInvoices(filters);
    return successResponse(res, 200, 'Invoices retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    return successResponse(res, 200, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
    return successResponse(res, 200, 'Invoice updated successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await invoiceService.updateInvoiceStatus(req.params.id, status);
    return successResponse(res, 200, 'Invoice status updated successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    await invoiceService.deleteInvoice(req.params.id);
    return successResponse(res, 200, 'Invoice deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getUnbilledTimeEntries = async (req, res, next) => {
  try {
    const { clientId } = req.query;
    const timeEntries = await invoiceService.getUnbilledTimeEntries(clientId);
    return successResponse(res, 200, 'Unbilled time entries retrieved successfully', timeEntries);
  } catch (error) {
    next(error);
  }
};
