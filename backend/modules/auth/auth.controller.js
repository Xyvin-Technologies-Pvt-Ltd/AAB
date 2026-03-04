import { successResponse, errorResponse } from '../../helpers/response.js';
import * as authService from './auth.service.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return successResponse(res, 201, 'User registered successfully', user);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return successResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    return successResponse(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    return successResponse(res, 200, 'Password changed successfully', result);
  } catch (error) {
    next(error);
  }
};

export const updateAccountDetails = async (req, res, next) => {
  try {
    const updateData = {
      name: req.body.name,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
    };
    const profileImageFile = req.file || null;
    const user = await authService.updateAccountDetails(
      req.user.id,
      updateData,
      profileImageFile
    );
    return successResponse(res, 200, 'Account details updated successfully', user);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return successResponse(res, 200, result.message, null);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    return successResponse(res, 200, 'Password reset successfully', result);
  } catch (error) {
    next(error);
  }
};

