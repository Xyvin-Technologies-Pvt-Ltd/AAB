import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as packageController from './package.controller.js';
import { createPackageSchema, updatePackageSchema } from '../../validators/schemas/package.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createPackageSchema), packageController.createPackage);
router.get('/', cacheRoute([CACHE_TAGS.PACKAGES, CACHE_TAGS.CLIENTS], { ttl: 60 }), packageController.getPackages);
router.get('/:id', cacheRoute([CACHE_TAGS.PACKAGES], { ttl: 60 }), packageController.getPackageById);
router.put('/:id', validate(updatePackageSchema), packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

export default router;

