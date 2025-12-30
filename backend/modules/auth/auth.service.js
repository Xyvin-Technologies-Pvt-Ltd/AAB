import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from './auth.model.js';
import Employee from '../employee/employee.model.js';
import { jwtConfig } from '../../config/jwt.js';
import { sendPasswordResetEmail } from '../../helpers/emailService.js';

export const registerUser = async (userData) => {
  const { email, password, role, employeeId } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // If employeeId is provided, verify it exists
  if (employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role: role || 'EMPLOYEE',
    employeeId: employeeId || null,
  });

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
  };
};

export const loginUser = async (email, password) => {
  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('User account is inactive');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = jwt.sign({ id: user._id }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    },
  };
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours dateOfBirth profilePicture')
    .select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  // Find user and include password for comparison
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return {
    id: user._id,
    email: user.email,
    role: user.role,
  };
};

export const updateAccountDetails = async (userId, updateData, profileImageFile) => {
  const user = await User.findById(userId).populate('employeeId');

  if (!user) {
    throw new Error('User not found');
  }

  // If user has an employeeId, update the employee record
  if (user.employeeId) {
    const Employee = (await import('../employee/employee.model.js')).default;
    const { uploadFile, deleteFile } = await import('../../helpers/s3Storage.js');

    const employee = await Employee.findById(user.employeeId._id);

    if (!employee) {
      throw new Error('Employee record not found');
    }

    // Update name and dateOfBirth
    if (updateData.name !== undefined) {
      employee.name = updateData.name;
    }
    if (updateData.dateOfBirth !== undefined) {
      employee.dateOfBirth = updateData.dateOfBirth || null;
    }

    // Handle profile picture upload
    if (profileImageFile) {
      // Delete old profile picture if exists
      if (employee.profilePicture?.key) {
        try {
          await deleteFile(employee.profilePicture.key);
        } catch (error) {
          console.error('Error deleting old profile picture:', error);
        }
      }

      // Upload new profile picture
      const uploadResult = await uploadFile(profileImageFile, 'employees/profile-pictures');
      employee.profilePicture = {
        url: uploadResult.url,
        key: uploadResult.key,
      };
    }

    await employee.save();

    // Return updated user with populated employee data
    return await User.findById(userId)
      .populate('employeeId', 'name monthlyCost monthlyWorkingHours dateOfBirth profilePicture')
      .select('-password');
  } else {
    throw new Error('User does not have an associated employee record');
  }
};

export const forgotPassword = async (email) => {
  // Find user by email
  const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    // Don't reveal if user exists or not for security
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token expiration (1 hour)
  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  await user.save({ validateBeforeSave: false });

  // Send reset email with unhashed token
  try {
    await sendPasswordResetEmail(user.email, resetToken);
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  } catch (error) {
    // If email fails, clear the token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new Error('Error sending password reset email. Please try again later.');
  }
};

export const resetPassword = async (token, newPassword) => {
  // Hash the token to compare with stored hash
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token and not expired
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+password +resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  // Update password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  return {
    id: user._id,
    email: user.email,
    role: user.role,
  };
};

