import Joi from 'joi';

export const createActivitySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Activity name is required',
  }),
});

export const updateActivitySchema = Joi.object({
  name: Joi.string().trim(),
});

