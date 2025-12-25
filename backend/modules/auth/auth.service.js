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
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

