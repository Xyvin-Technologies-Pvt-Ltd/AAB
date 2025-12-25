import Client from './client.model.js';

export const createClient = async (clientData) => {
  const client = await Client.create(clientData);
  return client;
};

export const getClients = async (filters = {}) => {
  const { search, status, page = 1, limit = 10 } = filters;

  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Client.countDocuments(query),
  ]);

  return {
    clients,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getClientById = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }
  return client;
};

export const updateClient = async (clientId, updateData) => {
  const client = await Client.findByIdAndUpdate(clientId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!client) {
    throw new Error('Client not found');
  }

  return client;
};

export const deleteClient = async (clientId) => {
  const client = await Client.findByIdAndDelete(clientId);
  if (!client) {
    throw new Error('Client not found');
  }
  return client;
};

export const addDocument = async (clientId, documentData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  client.documents.push(documentData);
  await client.save();
  return client;
};

export const removeDocument = async (clientId, documentId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const document = client.documents.id(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  client.documents.pull(documentId);
  await client.save();
  return { client, document };
};

