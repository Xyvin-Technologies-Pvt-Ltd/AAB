import mongoose from 'mongoose';
import Invoice from './invoice.model.js';
import Client from '../client/client.model.js';
import TimeEntry from '../timeEntry/timeEntry.model.js';

const VALID_STATUS_TRANSITIONS = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  PAID: [],
  OVERDUE: ['PAID', 'CANCELLED'],
  CANCELLED: [],
};

function computeTotals(lineItems = [], taxRate = 0, discount = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
  const total = Math.max(0, subtotal + taxAmount - (Number(discount) || 0));
  return { subtotal, taxAmount, total };
}

async function getNextInvoiceNumber() {
  const all = await Invoice.find().select('invoiceNumber').lean();
  let maxNum = 0;
  for (const doc of all) {
    const match = doc?.invoiceNumber?.match(/^INV-0*(\d+)$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  const next = String(maxNum + 1).padStart(4, '0');
  return `INV-${next}`;
}

export const createInvoice = async (invoiceData, userId) => {
  const client = await Client.findById(invoiceData.clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const timeEntryIds = invoiceData.timeEntries || [];
  if (timeEntryIds.length > 0) {
    const entries = await TimeEntry.find({
      _id: { $in: timeEntryIds },
      clientId: invoiceData.clientId,
      invoiceId: null,
      isRunning: false,
      isPaused: false,
    });
    if (entries.length !== timeEntryIds.length) {
      throw new Error('One or more time entries are invalid, already invoiced, or do not belong to this client');
    }
  }

  const { subtotal, taxAmount, total } = computeTotals(
    invoiceData.lineItems || [],
    invoiceData.taxRate ?? 0,
    invoiceData.discount ?? 0
  );

  const invoiceNumber = await getNextInvoiceNumber();
  const status = invoiceData.status === 'SENT' ? 'SENT' : 'DRAFT';
  const invoice = await Invoice.create({
    ...invoiceData,
    invoiceNumber,
    status,
    subtotal,
    taxAmount,
    total,
    createdBy: userId,
  });

  if (timeEntryIds.length > 0) {
    await TimeEntry.updateMany(
      { _id: { $in: timeEntryIds } },
      { $set: { invoiceId: invoice._id } }
    );
  }

  return getInvoiceById(invoice._id);
};

export const getInvoices = async (filters = {}) => {
  const { clientId, status, startDate, endDate, page = 1, limit = 10 } = filters;
  const query = {};

  if (clientId) query.clientId = clientId;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.issueDate = {};
    if (startDate) query.issueDate.$gte = new Date(startDate);
    if (endDate) query.issueDate.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate('clientId', 'name email phone contactPerson businessInfo')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(query),
  ]);

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getInvoiceById = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate('clientId', 'name nameArabic email phone contactPerson businessInfo')
    .populate('createdBy', 'name email')
    .populate({
      path: 'timeEntries',
      populate: [
        { path: 'employeeId', select: 'name monthlyCost monthlyWorkingHours' },
        { path: 'clientId', select: 'name' },
        { path: 'packageId', select: 'name' },
        { path: 'taskId', select: 'name category' },
      ],
    });

  if (!invoice) {
    throw new Error('Invoice not found');
  }
  return invoice;
};

export const updateInvoice = async (invoiceId, updateData) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  if (invoice.status !== 'DRAFT') {
    throw new Error('Only draft invoices can be updated');
  }

  const lineItems = updateData.lineItems !== undefined ? updateData.lineItems : invoice.lineItems;
  const taxRate = updateData.taxRate !== undefined ? updateData.taxRate : invoice.taxRate;
  const discount = updateData.discount !== undefined ? updateData.discount : invoice.discount;
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate, discount);

  const allowed = ['lineItems', 'timeEntries', 'issueDate', 'dueDate', 'notes', 'taxRate', 'discount'];
  const payload = { subtotal, taxAmount, total };
  allowed.forEach((key) => {
    if (updateData[key] !== undefined) payload[key] = updateData[key];
  });

  const previousTimeEntryIds = (invoice.timeEntries || []).map((id) =>
    id instanceof mongoose.Types.ObjectId ? id : id._id
  );
  const newTimeEntryIds = payload.timeEntries !== undefined ? payload.timeEntries : previousTimeEntryIds;

  const updated = await Invoice.findByIdAndUpdate(invoiceId, payload, {
    new: true,
    runValidators: true,
  })
    .populate('clientId', 'name nameArabic email phone contactPerson businessInfo')
    .populate('createdBy', 'name email')
    .populate({
      path: 'timeEntries',
      populate: [
        { path: 'employeeId', select: 'name monthlyCost monthlyWorkingHours' },
        { path: 'clientId', select: 'name' },
        { path: 'packageId', select: 'name' },
        { path: 'taskId', select: 'name category' },
      ],
    });

  const toRemove = previousTimeEntryIds.filter((id) => !newTimeEntryIds.some((n) => n.toString() === id.toString()));
  const toAdd = newTimeEntryIds.filter((id) => !previousTimeEntryIds.some((p) => p.toString() === id.toString()));

  if (toRemove.length > 0) {
    await TimeEntry.updateMany({ _id: { $in: toRemove } }, { $set: { invoiceId: null } });
  }
  if (toAdd.length > 0) {
    const clientId = updated.clientId._id || updated.clientId;
    const valid = await TimeEntry.find({
      _id: { $in: toAdd },
      clientId,
      invoiceId: null,
    });
    if (valid.length !== toAdd.length) {
      throw new Error('One or more time entries are invalid or already invoiced');
    }
    await TimeEntry.updateMany({ _id: { $in: toAdd } }, { $set: { invoiceId: updated._id } });
  }

  return getInvoiceById(updated._id);
};

export const updateInvoiceStatus = async (invoiceId, newStatus) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  const allowed = VALID_STATUS_TRANSITIONS[invoice.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot change status from ${invoice.status} to ${newStatus}`);
  }
  const updated = await Invoice.findByIdAndUpdate(
    invoiceId,
    { status: newStatus },
    { new: true, runValidators: true }
  );
  return getInvoiceById(updated._id);
};

export const deleteInvoice = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  if (invoice.status !== 'DRAFT') {
    throw new Error('Only draft invoices can be deleted');
  }
  const timeEntryIds = (invoice.timeEntries || []).map((id) => (id instanceof mongoose.Types.ObjectId ? id : id._id));
  if (timeEntryIds.length > 0) {
    await TimeEntry.updateMany({ _id: { $in: timeEntryIds } }, { $set: { invoiceId: null } });
  }
  await Invoice.findByIdAndDelete(invoiceId);
  return invoice;
};

export const getUnbilledTimeEntries = async (clientId) => {
  if (!clientId) {
    throw new Error('Client ID is required');
  }
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }
  const timeEntries = await TimeEntry.find({
    clientId,
    invoiceId: null,
    isRunning: false,
    isPaused: false,
  })
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name')
    .populate('taskId', 'name category')
    .sort({ date: -1, createdAt: -1 })
    .lean();
  return timeEntries;
};
