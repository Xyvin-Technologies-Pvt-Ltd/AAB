import Joi from 'joi';

export const createServiceSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Service name is required',
  }),
});

export const updateServiceSchema = Joi.object({
  name: Joi.string().trim(),
});

