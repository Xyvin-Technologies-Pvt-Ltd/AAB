import Employee from './employee.model.js';

export const createEmployee = async (employeeData) => {
  const employee = await Employee.create(employeeData);
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

