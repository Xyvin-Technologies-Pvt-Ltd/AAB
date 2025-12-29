import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import * as timeEntryController from './timeEntry.controller.js';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  startTimerSchema,
} from '../../validators/schemas/timeEntry.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createTimeEntrySchema), timeEntryController.createTimeEntry);
router.get('/', timeEntryController.getTimeEntries);
router.get('/running', timeEntryController.getRunningTimer);
router.post('/start', validate(startTimerSchema), timeEntryController.startTimer);
router.post('/start-for-task/:taskId', timeEntryController.startTimerForTask);
router.post('/pause/:id', timeEntryController.pauseTimer);
router.post('/resume/:id', timeEntryController.resumeTimer);
router.post('/stop/:id', timeEntryController.stopTimer);
router.get('/:id', timeEntryController.getTimeEntryById);
router.put('/:id', validate(updateTimeEntrySchema), timeEntryController.updateTimeEntry);
router.delete('/:id', timeEntryController.deleteTimeEntry);

export default router;

