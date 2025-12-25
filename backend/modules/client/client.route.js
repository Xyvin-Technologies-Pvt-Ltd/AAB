import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import * as clientController from './client.controller.js';
import { createClientSchema, updateClientSchema } from '../../validators/schemas/client.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes accessible to both ADMIN and EMPLOYEE
router.post('/', validate(createClientSchema), clientController.createClient);
router.get('/', clientController.getClients);
router.get('/:id', clientController.getClientById);
router.put('/:id', validate(updateClientSchema), clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

// Document routes
router.post('/:id/documents', uploadSingle, clientController.uploadDocument);
router.delete('/:id/documents/:documentId', clientController.deleteDocument);

export default router;

