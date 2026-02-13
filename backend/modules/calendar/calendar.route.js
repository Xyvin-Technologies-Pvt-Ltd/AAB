import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/auth.js';
import * as calendarController from './calendar.controller.js';

const router = express.Router();

// Generate or refresh calendar feed token (authenticated)
router.post('/generate-token', authenticate, calendarController.generateToken);

// Revoke calendar feed token (authenticated)
router.delete('/revoke-token', authenticate, calendarController.revokeToken);

// Public iCal feed - no auth (calendar apps cannot send JWT). Token in URL. Rate limit to prevent abuse.
const feedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many feed requests, try again later.' },
});
router.get('/feed/:token', feedLimiter, calendarController.getFeed);

export default router;
