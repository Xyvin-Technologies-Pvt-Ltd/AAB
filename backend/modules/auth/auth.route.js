import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import * as authController from './auth.controller.js';
import { registerSchema, loginSchema } from '../../validators/schemas/auth.schema.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);

export default router;

