import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as activityController from './activity.controller.js';
import { createActivitySchema, updateActivitySchema } from '../../validators/schemas/activity.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createActivitySchema), activityController.createActivity);
router.get('/', cacheRoute([CACHE_TAGS.ACTIVITIES], { ttl: 300 }), activityController.getActivities);
router.get('/:id', cacheRoute([CACHE_TAGS.ACTIVITIES], { ttl: 300 }), activityController.getActivityById);
router.put('/:id', validate(updateActivitySchema), activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

export default router;

