import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import * as clientController from './client.controller.js';
import {
  createClientSchema,
  updateClientSchema,
  uploadDocumentSchema,
  verifyDocumentSchema,
  businessInfoSchema,
  personSchema,
  updatePersonSchema,
  emaraTaxCredentialsSchema,
} from '../../validators/schemas/client.schema.js';

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
router.post(
  '/:id/documents/:type/upload',
  uploadSingle,
  clientController.uploadDocumentByType
);
router.post('/:id/documents/:documentId/process', clientController.processDocument);
router.patch(
  '/:id/documents/:documentId/verify',
  validate(verifyDocumentSchema),
  clientController.verifyDocument
);
router.delete('/:id/documents/:documentId', clientController.deleteDocument);

// Business information routes
router.patch('/:id/business-info', validate(businessInfoSchema), clientController.updateBusinessInfo);

// EmaraTax credentials routes
router.patch('/:id/emaratax-credentials', validate(emaraTaxCredentialsSchema), clientController.updateEmaraTaxCredentials);

// Partners and Managers routes
router.post('/:id/partners', validate(personSchema), clientController.addPerson);
router.patch(
  '/:id/partners/:personId',
  validate(updatePersonSchema),
  clientController.updatePerson
);
router.delete('/:id/partners/:personId', clientController.removePerson);

router.post('/:id/managers', validate(personSchema), clientController.addPerson);
router.patch(
  '/:id/managers/:personId',
  validate(updatePersonSchema),
  clientController.updatePerson
);
router.delete('/:id/managers/:personId', clientController.removePerson);

// Compliance routes
router.get('/:id/compliance', clientController.getComplianceStatus);
router.get('/alerts/all', clientController.getAllAlerts);

export default router;

