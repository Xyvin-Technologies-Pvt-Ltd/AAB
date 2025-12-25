import Joi from 'joi';

export const createClientSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Client name is required',
  }),
  contactPerson: Joi.string().trim().allow('', null),
  email: Joi.string().email().trim().allow('', null).messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().trim().allow('', null),
  documents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      key: Joi.string().required(),
      uploadedAt: Joi.date(),
    })
  ),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE'),
});

export const updateClientSchema = Joi.object({
  name: Joi.string().trim(),
  contactPerson: Joi.string().trim().allow('', null),
  email: Joi.string().email().trim().allow('', null).messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().trim().allow('', null),
  documents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      key: Joi.string().required(),
      uploadedAt: Joi.date(),
    })
  ),
  status: Joi.string().valid('ACTIVE', 'INACTIVE'),
});

