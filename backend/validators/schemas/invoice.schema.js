import Joi from 'joi';

const lineItemSchema = Joi.object({
  description: Joi.string().trim().required(),
  quantity: Joi.number().min(0).default(1),
  rate: Joi.number().min(0).default(0),
  amount: Joi.number().min(0).default(0),
});

export const createInvoiceSchema = Joi.object({
  clientId: Joi.string().hex().length(24).required(),
  lineItems: Joi.array().items(lineItemSchema).min(1).required(),
  timeEntries: Joi.array().items(Joi.string().hex().length(24)).default([]),
  taxRate: Joi.number().min(0).max(100).default(0),
  discount: Joi.number().min(0).default(0),
  issueDate: Joi.date().required(),
  dueDate: Joi.date().required(),
  notes: Joi.string().trim().allow('').default(''),
  status: Joi.string().valid('DRAFT', 'SENT').default('DRAFT'),
});

export const updateInvoiceSchema = Joi.object({
  lineItems: Joi.array().items(lineItemSchema),
  timeEntries: Joi.array().items(Joi.string().hex().length(24)),
  taxRate: Joi.number().min(0).max(100),
  discount: Joi.number().min(0),
  issueDate: Joi.date(),
  dueDate: Joi.date(),
  notes: Joi.string().trim().allow(''),
});

export const updateInvoiceStatusSchema = Joi.object({
  status: Joi.string().valid('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED').required(),
});
