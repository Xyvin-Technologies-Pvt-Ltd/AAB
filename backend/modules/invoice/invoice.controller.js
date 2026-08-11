import { successResponse } from '../../helpers/response.js';
import * as invoiceService from './invoice.service.js';
import { parsePage, parseLimit } from '../../helpers/pagination.js';
import { invalidateTags } from '../../helpers/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';

// Invoice create/update/delete all mark or unmark time entries as invoiced.
const INVOICE_TAGS = [CACHE_TAGS.INVOICES, CACHE_TAGS.TIME_ENTRIES, CACHE_TAGS.ANALYTICS];

export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice(req.body, req.user._id);
    await invalidateTags(INVOICE_TAGS);
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
      page: parsePage(req.query.page),
      limit: parseLimit(req.query.limit),
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
    await invalidateTags(INVOICE_TAGS);
    return successResponse(res, 200, 'Invoice updated successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await invoiceService.updateInvoiceStatus(req.params.id, status);
    await invalidateTags([CACHE_TAGS.INVOICES, CACHE_TAGS.ANALYTICS]);
    return successResponse(res, 200, 'Invoice status updated successfully', invoice);
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    await invoiceService.deleteInvoice(req.params.id);
    await invalidateTags(INVOICE_TAGS);
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
