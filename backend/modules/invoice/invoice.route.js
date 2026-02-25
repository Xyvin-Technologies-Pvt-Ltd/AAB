import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/auth.js';
import * as invoiceController from './invoice.controller.js';
import { createInvoiceSchema, updateInvoiceSchema } from '../../validators/schemas/invoice.schema.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/unbilled-time-entries', invoiceController.getUnbilledTimeEntries);
router.post('/', validate(createInvoiceSchema), invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.patch('/:id/status', invoiceController.updateInvoiceStatus);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;
