import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import { uploadSingle } from '../../middlewares/upload.js';
import * as taskController from './task.controller.js';
import { createTaskSchema, updateTaskSchema } from '../../validators/schemas/task.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/calendar', taskController.getCalendarTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/order', taskController.updateTaskOrder);
router.delete('/:id', taskController.deleteTask);

// Comments routes
router.post('/:id/comments', taskController.addComment);
router.delete('/:id/comments/:commentId', taskController.deleteComment);

// Attachments routes
router.post('/:id/attachments', uploadSingle, taskController.addAttachment);
router.delete('/:id/attachments/:attachmentId', taskController.deleteAttachment);

export default router;

