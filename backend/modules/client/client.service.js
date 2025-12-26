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
  const client = await Client.findById(clientId).select('+emaraTaxAccount.password');
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

export const uploadDocumentByType = async (clientId, category, documentData, uploadedBy) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Check if document of this category already exists
  const existingDoc = client.documents.find((doc) => doc.category === category);
  if (existingDoc) {
    // Update existing document
    Object.assign(existingDoc, {
      ...documentData,
      category,
      uploadedBy,
      uploadedAt: new Date(),
      processingStatus: 'PENDING',
    });
  } else {
    // Add new document
    client.documents.push({
      ...documentData,
      category,
      uploadedBy,
      uploadedAt: new Date(),
      processingStatus: 'PENDING',
    });
  }

  await client.save();
  return client;
};

export const processDocument = async (clientId, documentId, extractedData, processingMetadata) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const document = client.documents.id(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  document.extractedData = extractedData;
  document.processingStatus = 'COMPLETED';
  document.processedAt = new Date();

  await client.save();
  return { client, document, processingMetadata };
};

export const verifyDocument = async (clientId, documentId, verifiedFields, verifiedBy) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const document = client.documents.id(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  document.uploadStatus = 'VERIFIED';
  document.verifiedBy = verifiedBy;
  document.verifiedAt = new Date();

  // Update verified fields in business info if provided
  if (verifiedFields && verifiedFields.length > 0) {
    if (!client.businessInfo.verifiedFields) {
      client.businessInfo.verifiedFields = [];
    }
    verifiedFields.forEach((field) => {
      if (!client.businessInfo.verifiedFields.includes(field)) {
        client.businessInfo.verifiedFields.push(field);
      }
    });
  }

  await client.save();
  return client;
};

export const updateBusinessInfo = async (clientId, businessInfoData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Handle nested fields
  if (businessInfoData.address !== undefined) {
    client.businessInfo.address = businessInfoData.address;
  }
  if (businessInfoData.emirate !== undefined) {
    client.businessInfo.emirate = businessInfoData.emirate;
  }
  if (businessInfoData.trn !== undefined) {
    client.businessInfo.trn = businessInfoData.trn;
  }
  if (businessInfoData.ctrn !== undefined) {
    client.businessInfo.ctrn = businessInfoData.ctrn;
  }
  if (businessInfoData.vatReturnCycle !== undefined) {
    client.businessInfo.vatReturnCycle = businessInfoData.vatReturnCycle;
  }
  if (businessInfoData.corporateTaxDueDate !== undefined) {
    client.businessInfo.corporateTaxDueDate = businessInfoData.corporateTaxDueDate
      ? new Date(businessInfoData.corporateTaxDueDate)
      : null;
  }
  if (businessInfoData.licenseNumber !== undefined) {
    client.businessInfo.licenseNumber = businessInfoData.licenseNumber;
  }
  if (businessInfoData.licenseStartDate !== undefined) {
    client.businessInfo.licenseStartDate = businessInfoData.licenseStartDate
      ? new Date(businessInfoData.licenseStartDate)
      : null;
  }
  if (businessInfoData.licenseExpiryDate !== undefined) {
    client.businessInfo.licenseExpiryDate = businessInfoData.licenseExpiryDate
      ? new Date(businessInfoData.licenseExpiryDate)
      : null;
  }
  if (businessInfoData.turnover !== undefined) {
    client.businessInfo.turnover = businessInfoData.turnover;
  }
  if (businessInfoData.remarks !== undefined) {
    client.businessInfo.remarks = businessInfoData.remarks;
  }
  if (businessInfoData.verifiedFields !== undefined) {
    client.businessInfo.verifiedFields = businessInfoData.verifiedFields;
  }

  // Update name if provided
  if (businessInfoData.name !== undefined) {
    client.name = businessInfoData.name;
  }
  if (businessInfoData.nameArabic !== undefined) {
    client.nameArabic = businessInfoData.nameArabic;
  }

  await client.save();
  return client;
};

export const addPerson = async (clientId, personData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  if (personData.role === 'PARTNER') {
    client.partners.push(personData);
  } else if (personData.role === 'MANAGER') {
    client.managers.push(personData);
  } else {
    throw new Error('Invalid role. Must be PARTNER or MANAGER');
  }

  await client.save();
  return client;
};

export const updatePerson = async (clientId, personId, personData, role) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const personArray = role === 'PARTNER' ? client.partners : client.managers;
  const person = personArray.id(personId);
  if (!person) {
    throw new Error('Person not found');
  }

  Object.assign(person, personData);
  person.updatedAt = new Date();

  await client.save();
  return client;
};

export const removePerson = async (clientId, personId, role) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  if (role === 'PARTNER') {
    client.partners.pull(personId);
  } else if (role === 'MANAGER') {
    client.managers.pull(personId);
  } else {
    throw new Error('Invalid role');
  }

  await client.save();
  return client;
};

export const getComplianceStatus = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const { calculateComplianceStatus } = await import('../../services/compliance.service.js');
  return calculateComplianceStatus(client);
};

export const getAllAlerts = async (filters = {}) => {
  const { type, severity } = filters;
  const clients = await Client.find({ status: 'ACTIVE' });
  const { calculateComplianceStatus } = await import('../../services/compliance.service.js');

  const allAlerts = [];
  const deadlines = [];

  for (const client of clients) {
    const compliance = calculateComplianceStatus(client);

    // Process alerts
    compliance.alerts.forEach((alert) => {
      const alertWithClient = {
        ...alert,
        clientId: client._id,
        clientName: client.name,
        dueDate: alert.dueDate || alert.expiryDate,
      };

      // Filter by type if specified
      if (type && !alert.type.toLowerCase().includes(type.toLowerCase())) {
        return;
      }

      // Filter by severity if specified
      if (severity && alert.severity !== severity) {
        return;
      }

      allAlerts.push(alertWithClient);
    });

    // Extract deadlines from expiring documents
    if (compliance.expiringDocuments && compliance.expiringDocuments.length > 0) {
      compliance.expiringDocuments.forEach((doc) => {
        const deadline = {
          clientId: client._id,
          clientName: client.name,
          type: doc.type,
          expiryDate: doc.expiresAt || doc.expiryDate,
          daysUntilExpiry: doc.daysUntilExpiry,
          category: doc.type,
        };

        if (type && !doc.type.toLowerCase().includes(type.toLowerCase())) {
          return;
        }

        deadlines.push(deadline);
      });
    }

    // Add corporate tax due date as deadline
    if (client.businessInfo?.corporateTaxDueDate) {
      const dueDate = new Date(client.businessInfo.corporateTaxDueDate);
      const now = new Date();
      const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

      if (!type || type.toLowerCase().includes('corporate') || type.toLowerCase().includes('tax')) {
        deadlines.push({
          clientId: client._id,
          clientName: client.name,
          type: 'CORPORATE_TAX_DUE',
          expiryDate: dueDate,
          daysUntilExpiry: daysUntilDue,
          category: 'CORPORATE_TAX_CERTIFICATE',
        });
      }
    }

    // Add license expiry as deadline
    if (client.businessInfo?.licenseExpiryDate) {
      const expiryDate = new Date(client.businessInfo.licenseExpiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (!type || type.toLowerCase().includes('license') || type.toLowerCase().includes('trade')) {
        deadlines.push({
          clientId: client._id,
          clientName: client.name,
          type: 'TRADE_LICENSE_EXPIRY',
          expiryDate: expiryDate,
          daysUntilExpiry: daysUntilExpiry,
          category: 'TRADE_LICENSE',
        });
      }
    }
  }

  // Sort deadlines by date (soonest first)
  deadlines.sort((a, b) => {
    const dateA = new Date(a.expiryDate);
    const dateB = new Date(b.expiryDate);
    return dateA - dateB;
  });

  // Sort alerts by severity and date
  allAlerts.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    const dateA = a.dueDate || a.expiryDate ? new Date(a.dueDate || a.expiryDate) : new Date(0);
    const dateB = b.dueDate || b.expiryDate ? new Date(b.dueDate || b.expiryDate) : new Date(0);
    return dateA - dateB;
  });

  return {
    alerts: allAlerts,
    deadlines,
    totalAlerts: allAlerts.length,
    totalDeadlines: deadlines.length,
  };
};

export const updateEmaraTaxCredentials = async (clientId, credentials) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  if (!client.emaraTaxAccount) {
    client.emaraTaxAccount = {};
  }

  if (credentials.username !== undefined) {
    client.emaraTaxAccount.username = credentials.username;
  }

  if (credentials.password !== undefined && credentials.password !== null && credentials.password !== '') {
    // Password will be hashed by the pre-save hook
    client.emaraTaxAccount.password = credentials.password;
  }

  await client.save();
  
  // Return client without password
  const clientWithoutPassword = await Client.findById(clientId).select('-emaraTaxAccount.password');
  return clientWithoutPassword;
};

