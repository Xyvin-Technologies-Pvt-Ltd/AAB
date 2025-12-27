import Service from './service.model.js';

export const createService = async (serviceData) => {
  const service = await Service.create(serviceData);
  return service;
};

export const getServices = async (filters = {}) => {
  const { search, page = 1, limit = 10 } = filters;

  const query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [services, total] = await Promise.all([
    Service.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Service.countDocuments(query),
  ]);

  return {
    services,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getServiceById = async (serviceId) => {
  const service = await Service.findById(serviceId);
  if (!service) {
    throw new Error('Service not found');
  }
  return service;
};

export const updateService = async (serviceId, updateData) => {
  const service = await Service.findByIdAndUpdate(serviceId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!service) {
    throw new Error('Service not found');
  }

  return service;
};

export const deleteService = async (serviceId) => {
  const service = await Service.findByIdAndDelete(serviceId);
  if (!service) {
    throw new Error('Service not found');
  }
  return service;
};

