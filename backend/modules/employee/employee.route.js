import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import * as employeeController from './employee.controller.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../../validators/schemas/employee.schema.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('ADMIN'));

router.post('/', validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Document routes
router.post('/:id/documents', uploadSingle, employeeController.uploadDocument);
router.delete('/:id/documents/:documentId', employeeController.deleteDocument);

// Profile picture route
router.post('/:id/profile-picture', uploadSingle, employeeController.uploadProfilePicture);
router.delete('/:id/profile-picture', employeeController.deleteProfilePicture);

export default router;

