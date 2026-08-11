import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as employeeController from './employee.controller.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../../validators/schemas/employee.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET routes - allow all authenticated users (needed for task assignment)
router.get('/', cacheRoute([CACHE_TAGS.EMPLOYEES], { ttl: 120 }), employeeController.getEmployees);
router.get('/:id', cacheRoute([CACHE_TAGS.EMPLOYEES], { ttl: 120 }), employeeController.getEmployeeById);

// Write operations - admin only
router.use(authorize('ADMIN'));

router.post('/', validate(createEmployeeSchema), employeeController.createEmployee);
router.put('/:id', validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Document routes
router.post('/:id/documents', uploadSingle, employeeController.uploadDocument);
router.delete('/:id/documents/:documentId', employeeController.deleteDocument);

// Profile picture route
router.post('/:id/profile-picture', uploadSingle, employeeController.uploadProfilePicture);
router.delete('/:id/profile-picture', employeeController.deleteProfilePicture);
router.post('/:id/send-credentials', employeeController.sendEmployeeCredentials);

export default router;

