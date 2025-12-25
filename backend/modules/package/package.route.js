import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import * as packageController from './package.controller.js';
import { createPackageSchema, updatePackageSchema } from '../../validators/schemas/package.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createPackageSchema), packageController.createPackage);
router.get('/', packageController.getPackages);
router.get('/:id', packageController.getPackageById);
router.put('/:id', validate(updatePackageSchema), packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

export default router;

