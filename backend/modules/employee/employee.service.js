import Employee from './employee.model.js';
import User from '../auth/auth.model.js';
import { sendWelcomeEmail } from '../../helpers/emailService.js';
import crypto from 'crypto';

/**
 * Generate a secure random password
 * @returns {string} - Random password
 */
const generatePassword = () => {
  // Generate 12 character password with uppercase, lowercase, numbers, and special chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export const createEmployee = async (employeeData) => {
  const employee = await Employee.create(employeeData);

  // If employee has an email, create a user account with auto-generated password
  if (employee.email) {
    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: employee.email });
    if (existingUser) {
      // User already exists, just link the employeeId if not already linked
      if (!existingUser.employeeId) {
        existingUser.employeeId = employee._id;
        await existingUser.save();
      }
    } else {
      // Generate secure password
      const generatedPassword = generatePassword();

      // Create user account
      const user = await User.create({
        email: employee.email,
        password: generatedPassword,
        role: employeeData.role || 'EMPLOYEE',
        employeeId: employee._id,
      });

      // Send welcome email with credentials
      try {
        await sendWelcomeEmail(employee.email, generatedPassword, employee.name);
      } catch (error) {
        // Log error but don't fail employee creation
        console.error('Error sending welcome email:', error);
      }
    }
  }

  return employee;
};

export const getEmployees = async (filters = {}) => {
  const { search, isActive, page = 1, limit = 10 } = filters;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Employee.countDocuments(query),
  ]);

  return {
    employees,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getEmployeeById = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
  return employee;
};

export const updateEmployee = async (employeeId, updateData) => {
  const employee = await Employee.findByIdAndUpdate(employeeId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  return employee;
};

export const deleteEmployee = async (employeeId) => {
  const employee = await Employee.findByIdAndDelete(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
  return employee;
};

export const addDocument = async (employeeId, documentData) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  employee.documents.push(documentData);
  await employee.save();
  return employee;
};

export const removeDocument = async (employeeId, documentId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  const document = employee.documents.id(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  employee.documents.pull(documentId);
  await employee.save();
  return { employee, document };
};

export const updateProfilePicture = async (employeeId, profilePictureData) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  // Store old key for deletion
  const oldKey = employee.profilePicture?.key;

  employee.profilePicture = profilePictureData;
  await employee.save();

  return { employee, oldKey };
};

export const removeProfilePicture = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  const oldKey = employee.profilePicture?.key;
  employee.profilePicture = undefined;
  await employee.save();

  return { employee, oldKey };
};

