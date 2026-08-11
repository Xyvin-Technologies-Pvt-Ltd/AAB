import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as serviceController from './service.controller.js';
import { createServiceSchema, updateServiceSchema } from '../../validators/schemas/service.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createServiceSchema), serviceController.createService);
router.get('/', cacheRoute([CACHE_TAGS.SERVICES], { ttl: 300 }), serviceController.getServices);
router.get('/:id', cacheRoute([CACHE_TAGS.SERVICES], { ttl: 300 }), serviceController.getServiceById);
router.put('/:id', validate(updateServiceSchema), serviceController.updateService);
router.delete('/:id', serviceController.deleteService);

export default router;

