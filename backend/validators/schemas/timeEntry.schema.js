import Joi from 'joi';

export const createTimeEntrySchema = Joi.object({
  employeeId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Employee ID is required',
  }),
  clientId: Joi.string().hex().length(24).allow(null, ''),
  packageId: Joi.string().hex().length(24).allow(null, ''),
  taskId: Joi.string().hex().length(24).allow(null, ''),
  date: Joi.date().required().messages({
    'any.required': 'Date is required',
  }),
  minutesSpent: Joi.number().min(0).required().messages({
    'number.min': 'Minutes spent must be a positive number',
    'any.required': 'Minutes spent is required',
  }),
  description: Joi.string().trim().allow('', null),
  isMiscellaneous: Joi.boolean(),
  miscellaneousDescription: Joi.string().trim().allow('', null),
});

// Schema for starting a timer (minutesSpent is optional, will be set to 0)
export const startTimerSchema = Joi.object({
  employeeId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Employee ID is required',
  }),
  clientId: Joi.string().hex().length(24).allow(null, ''),
  packageId: Joi.string().hex().length(24).allow(null, ''),
  taskId: Joi.string().hex().length(24).allow(null, ''),
  date: Joi.date().allow(null, ''),
  minutesSpent: Joi.number().min(0).allow(null, ''),
  description: Joi.string().trim().allow('', null),
  isMiscellaneous: Joi.boolean(),
  miscellaneousDescription: Joi.string().trim().allow('', null),
});

export const updateTimeEntrySchema = Joi.object({
  employeeId: Joi.string().hex().length(24),
  clientId: Joi.string().hex().length(24),
  packageId: Joi.string().hex().length(24),
  taskId: Joi.string().hex().length(24),
  date: Joi.date(),
  minutesSpent: Joi.number().min(0),
  description: Joi.string().trim().allow('', null),
});

