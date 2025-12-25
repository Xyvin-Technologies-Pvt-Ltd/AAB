import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import * as documentsController from './documents.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/:key/signed-url', documentsController.getSignedUrlForDocument);

export default router;

