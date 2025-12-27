import jwt from 'jsonwebtoken';
import User from './auth.model.js';
import Employee from '../employee/employee.model.js';
import { jwtConfig } from '../../config/jwt.js';

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

