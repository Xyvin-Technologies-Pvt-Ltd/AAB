import Joi from 'joi';

export const createPackageSchema = Joi.object({
  clientId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Client ID is required',
  }),
  name: Joi.string().trim().required().messages({
    'any.required': 'Package name is required',
  }),
  type: Joi.string().valid('RECURRING', 'ONE_TIME').required().messages({
    'any.required': 'Package type is required',
  }),
  billingFrequency: Joi.when('type', {
    is: 'RECURRING',
    then: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').required(),
    otherwise: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').allow(null),
  }),
  contractValue: Joi.number().min(0).required().messages({
    'number.min': 'Contract value must be positive',
    'any.required': 'Contract value is required',
  }),
  startDate: Joi.date().required().messages({
    'any.required': 'Start date is required',
  }),
  endDate: Joi.date().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'COMPLETED').default('ACTIVE'),
});

export const updatePackageSchema = Joi.object({
  clientId: Joi.string().hex().length(24),
  name: Joi.string().trim(),
  type: Joi.string().valid('RECURRING', 'ONE_TIME'),
  billingFrequency: Joi.string().valid('MONTHLY', 'QUARTERLY', 'YEARLY').allow(null),
  contractValue: Joi.number().min(0),
  startDate: Joi.date(),
  endDate: Joi.date().allow(null),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'COMPLETED'),
});

