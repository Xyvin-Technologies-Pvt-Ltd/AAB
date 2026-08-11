import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as invoiceController from './invoice.controller.js';
import { createInvoiceSchema, updateInvoiceSchema, updateInvoiceStatusSchema } from '../../validators/schemas/invoice.schema.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get(
  '/unbilled-time-entries',
  cacheRoute([CACHE_TAGS.INVOICES, CACHE_TAGS.TIME_ENTRIES], { ttl: 20 }),
  invoiceController.getUnbilledTimeEntries
);
router.post('/', validate(createInvoiceSchema), invoiceController.createInvoice);
router.get('/', cacheRoute([CACHE_TAGS.INVOICES], { ttl: 60 }), invoiceController.getInvoices);
router.get('/:id', cacheRoute([CACHE_TAGS.INVOICES], { ttl: 60 }), invoiceController.getInvoiceById);
router.put('/:id', validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.patch('/:id/status', validate(updateInvoiceStatusSchema), invoiceController.updateInvoiceStatus);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;
