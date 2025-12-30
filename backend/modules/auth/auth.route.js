import express from 'express';
import { validate } from '../../middlewares/validator.js';
import { authenticate, authorize } from '../../middlewares/auth.js';
import { uploadProfilePicture } from '../../middlewares/upload.js';
import * as authController from './auth.controller.js';
import {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from '../../validators/schemas/auth.schema.js';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post(
    '/change-password',
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword
);
router.put(
    '/account-details',
    authenticate,
    uploadProfilePicture,
    authController.updateAccountDetails
);

export default router;

