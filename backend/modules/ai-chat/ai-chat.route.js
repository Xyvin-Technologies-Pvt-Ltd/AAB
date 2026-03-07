import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  streamChat,
  getSessions,
  getSession,
  deleteSession,
  getInsights,
} from './ai-chat.controller.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting specifically for the AI chat endpoint to manage OpenAI costs
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per minute per IP
  message: 'Too many chat requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate);

router.post('/stream', chatLimiter, streamChat);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.get('/insights', getInsights);

export default router;
