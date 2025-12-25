import Joi from 'joi';

export const createTimeEntrySchema = Joi.object({
  employeeId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Employee ID is required',
  }),
  clientId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Client ID is required',
  }),
  packageId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Package ID is required',
  }),
  taskId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Task ID is required',
  }),
  date: Joi.date().required().messages({
    'any.required': 'Date is required',
  }),
  minutesSpent: Joi.number().min(1).required().messages({
    'number.min': 'Minutes spent must be at least 1',
    'any.required': 'Minutes spent is required',
  }),
  description: Joi.string().trim().allow('', null),
});

export const updateTimeEntrySchema = Joi.object({
  employeeId: Joi.string().hex().length(24),
  clientId: Joi.string().hex().length(24),
  packageId: Joi.string().hex().length(24),
  taskId: Joi.string().hex().length(24),
  date: Joi.date(),
  minutesSpent: Joi.number().min(1),
  description: Joi.string().trim().allow('', null),
});

