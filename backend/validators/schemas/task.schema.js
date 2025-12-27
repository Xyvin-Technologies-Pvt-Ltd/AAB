import Joi from 'joi';

export const createTaskSchema = Joi.object({
  clientId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Client ID is required',
  }),
  packageId: Joi.string().hex().length(24).required().messages({
    'any.required': 'Package ID is required',
  }),
  name: Joi.string().trim().required().messages({
    'any.required': 'Task name is required',
  }),
  description: Joi.string().trim().allow('', null),
  category: Joi.string().trim().allow('', null),
  services: Joi.array().items(Joi.string().hex().length(24)).allow(null),
  activities: Joi.array().items(Joi.string().hex().length(24)).allow(null),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE').default('TODO'),
  assignedTo: Joi.alternatives().try(
    Joi.string().hex().length(24).allow(null),
    Joi.array().items(Joi.string().hex().length(24)).allow(null)
  ),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM'),
  dueDate: Joi.date().allow(null),
  estimatedMinutes: Joi.number().min(0).allow(null),
  labels: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
      })
    )
    .allow(null),
  order: Joi.number().default(0),
  isRecurring: Joi.boolean().default(false),
  recurringPattern: Joi.object({
    frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'),
    interval: Joi.number().min(1).default(1),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
    dayOfMonth: Joi.number().min(1).max(31),
    endDate: Joi.date().allow(null),
  }).allow(null),
  recurringParentId: Joi.string().hex().length(24).allow(null),
});

export const updateTaskSchema = Joi.object({
  clientId: Joi.string().hex().length(24),
  packageId: Joi.string().hex().length(24),
  name: Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  category: Joi.string().trim().allow('', null),
  services: Joi.array().items(Joi.string().hex().length(24)).allow(null),
  activities: Joi.array().items(Joi.string().hex().length(24)).allow(null),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE'),
  assignedTo: Joi.alternatives().try(
    Joi.string().hex().length(24).allow(null),
    Joi.array().items(Joi.string().hex().length(24)).allow(null)
  ),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
  dueDate: Joi.date().allow(null),
  estimatedMinutes: Joi.number().min(0).allow(null),
  labels: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().trim().required(),
        color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
      })
    )
    .allow(null),
  order: Joi.number(),
  isRecurring: Joi.boolean(),
  recurringPattern: Joi.object({
    frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'),
    interval: Joi.number().min(1).default(1),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
    dayOfMonth: Joi.number().min(1).max(31),
    endDate: Joi.date().allow(null),
  }).allow(null),
  recurringParentId: Joi.string().hex().length(24).allow(null),
});

