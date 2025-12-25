import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import * as employeeController from './employee.controller.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../../validators/schemas/employee.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Document routes
router.post('/:id/documents', uploadSingle, employeeController.uploadDocument);
router.delete('/:id/documents/:documentId', employeeController.deleteDocument);

export default router;

