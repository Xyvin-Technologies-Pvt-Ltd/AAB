import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import * as serviceController from './service.controller.js';
import { createServiceSchema, updateServiceSchema } from '../../validators/schemas/service.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createServiceSchema), serviceController.createService);
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceById);
router.put('/:id', validate(updateServiceSchema), serviceController.updateService);
router.delete('/:id', serviceController.deleteService);

export default router;

