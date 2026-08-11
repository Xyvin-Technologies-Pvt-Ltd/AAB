import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as taskController from './task.controller.js';
import { createTaskSchema, updateTaskSchema } from '../../validators/schemas/task.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/', cacheRoute([CACHE_TAGS.TASKS], { ttl: 30 }), taskController.getTasks);
router.get('/calendar', cacheRoute([CACHE_TAGS.TASKS], { ttl: 30 }), taskController.getCalendarTasks);
router.get('/workload', cacheRoute([CACHE_TAGS.TASKS], { ttl: 30 }), taskController.getWorkload);
router.get('/:id', cacheRoute([CACHE_TAGS.TASKS], { ttl: 30 }), taskController.getTaskById);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/order', taskController.updateTaskOrder);
router.patch('/:id/archive', taskController.archiveTask);
router.patch('/:id/unarchive', taskController.unarchiveTask);
router.delete('/:id', taskController.deleteTask);

// Comments routes
router.post('/:id/comments', taskController.addComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

// Attachments routes
router.post('/:id/attachments', uploadSingle, taskController.addAttachment);
router.delete('/:id/attachments/:attachmentId', taskController.deleteAttachment);

export default router;

