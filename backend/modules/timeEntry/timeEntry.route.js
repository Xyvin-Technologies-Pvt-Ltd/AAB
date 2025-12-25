import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate } from '../../middlewares/auth.js';
import * as timeEntryController from './timeEntry.controller.js';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
} from '../../validators/schemas/timeEntry.schema.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.post('/', validate(createTimeEntrySchema), timeEntryController.createTimeEntry);
router.get('/', timeEntryController.getTimeEntries);
router.get('/running', timeEntryController.getRunningTimer);
router.post('/start', validate(createTimeEntrySchema), timeEntryController.startTimer);
router.post('/stop/:id', timeEntryController.stopTimer);
router.get('/:id', timeEntryController.getTimeEntryById);
router.put('/:id', validate(updateTimeEntrySchema), timeEntryController.updateTimeEntry);
router.delete('/:id', timeEntryController.deleteTimeEntry);

export default router;

