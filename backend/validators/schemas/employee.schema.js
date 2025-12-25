import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Employee name is required',
  }),
  email: Joi.string().email().trim().lowercase().messages({
    'string.email': 'Please provide a valid email',
  }),
  designation: Joi.string().trim().allow('', null),
  hourlyRate: Joi.number().min(0).allow(null),
  monthlyCost: Joi.number().min(0).required().messages({
    'number.min': 'Monthly cost must be positive',
    'any.required': 'Monthly cost is required',
  }),
  monthlyWorkingHours: Joi.number().min(1).max(744).allow(null),
  documents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      key: Joi.string().required(),
      uploadedAt: Joi.date(),
    })
  ),
  isActive: Joi.boolean().default(true),
});

export const updateEmployeeSchema = Joi.object({
  name: Joi.string().trim(),
  email: Joi.string().email().trim().lowercase().messages({
    'string.email': 'Please provide a valid email',
  }),
  designation: Joi.string().trim().allow('', null),
  hourlyRate: Joi.number().min(0).allow(null),
  monthlyCost: Joi.number().min(0),
  monthlyWorkingHours: Joi.number().min(1).max(744).allow(null),
  documents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      key: Joi.string().required(),
      uploadedAt: Joi.date(),
    })
  ),
  isActive: Joi.boolean(),
});

