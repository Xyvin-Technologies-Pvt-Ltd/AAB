import Package from './package.model.js';
import Client from '../client/client.model.js';

export const createPackage = async (packageData) => {
  // Verify client exists
  const client = await Client.findById(packageData.clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const packageDoc = await Package.create(packageData);
  return packageDoc;
};

export const getPackages = async (filters = {}) => {
  const { clientId, type, status, search, page = 1, limit = 10 } = filters;

  const query = {};

  if (clientId) {
    query.clientId = clientId;
  }

  if (type) {
    query.type = type;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    Package.find(query)
      .populate('clientId', 'name status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Package.countDocuments(query),
  ]);

  return {
    packages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getPackageById = async (packageId) => {
  const packageDoc = await Package.findById(packageId).populate('clientId', 'name status');
  if (!packageDoc) {
    throw new Error('Package not found');
  }
  return packageDoc;
};

export const updatePackage = async (packageId, updateData) => {
  // If clientId is being updated, verify it exists
  if (updateData.clientId) {
    const client = await Client.findById(updateData.clientId);
    if (!client) {
      throw new Error('Client not found');
    }
  }

  const packageDoc = await Package.findByIdAndUpdate(packageId, updateData, {
    new: true,
    runValidators: true,
  }).populate('clientId', 'name status');

  if (!packageDoc) {
    throw new Error('Package not found');
  }

  return packageDoc;
};

export const deletePackage = async (packageId) => {
  const packageDoc = await Package.findByIdAndDelete(packageId);
  if (!packageDoc) {
    throw new Error('Package not found');
  }
  return packageDoc;
};

