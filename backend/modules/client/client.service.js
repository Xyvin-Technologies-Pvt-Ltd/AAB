import Client from './client.model.js';

/**
 * Format date to dd/mm/yyyy format
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDateDDMMYYYY = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

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

  // Delete from S3 first
  try {
    const { deleteFile } = await import('../../helpers/s3Storage.js');
    await deleteFile(document.key);
  } catch (s3Error) {
    // Log error but continue with DB deletion
    console.error('S3 deletion failed:', s3Error);
  }

  // Remove document from array
  client.documents.pull(documentId);
  await client.save();

  // Reload client to get updated state
  const updatedClient = await Client.findById(clientId);
  return { client: updatedClient, document };
};

export const uploadDocumentByType = async (clientId, category, documentData, uploadedBy, personId = null) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // For company documents (no personId), check if document of this category already exists
  // For person documents (with personId), check if document exists for this category and person
  const existingDoc = personId
    ? client.documents.find(
        (doc) => doc.category === category && doc.assignedToPerson?.toString() === personId.toString()
      )
    : client.documents.find((doc) => doc.category === category && !doc.assignedToPerson);

  if (existingDoc) {
    // Update existing document
    Object.assign(existingDoc, {
      ...documentData,
      category,
      uploadedBy,
      uploadedAt: new Date(),
      processingStatus: 'PENDING',
      assignedToPerson: personId || existingDoc.assignedToPerson,
    });
  } else {
    // Add new document
    client.documents.push({
      ...documentData,
      category,
      uploadedBy,
      uploadedAt: new Date(),
      processingStatus: 'PENDING',
      assignedToPerson: personId || null,
    });
  }

  await client.save();
  return client;
};

export const updateDocumentAssignment = async (clientId, documentId, personId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const document = client.documents.id(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  document.assignedToPerson = personId || null;
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
  if (businessInfoData.vatTaxPeriods !== undefined) {
    client.businessInfo.vatTaxPeriods = businessInfoData.vatTaxPeriods.map((period) => ({
      startDate: period.startDate ? new Date(period.startDate) : null,
      endDate: period.endDate ? new Date(period.endDate) : null,
    }));
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
    // Find all documents assigned to this partner
    const partnerDocs = client.documents.filter(
      doc => doc.assignedToPerson?.toString() === personId.toString()
    );
    
    // Delete each document from S3
    const { deleteFile } = await import('../../helpers/s3Storage.js');
    for (const doc of partnerDocs) {
      try {
        await deleteFile(doc.key);
      } catch (s3Error) {
        console.error('S3 deletion failed for', doc.key, s3Error);
      }
      // Remove from documents array
      client.documents.pull(doc._id);
    }
    
    // Remove the partner
    client.partners.pull(personId);
    
  } else if (role === 'MANAGER') {
    const manager = client.managers.id(personId);
    
    // Check if manager is linked to a partner
    if (manager && manager.linkedPartnerId) {
      // Just remove the manager, don't touch documents (they belong to the partner)
      client.managers.pull(personId);
    } else {
      // Standalone manager - delete their documents
      const managerDocs = client.documents.filter(
        doc => doc.assignedToPerson?.toString() === personId.toString()
      );
      
      const { deleteFile } = await import('../../helpers/s3Storage.js');
      for (const doc of managerDocs) {
        try {
          await deleteFile(doc.key);
        } catch (s3Error) {
          console.error('S3 deletion failed for', doc.key, s3Error);
        }
        client.documents.pull(doc._id);
      }
      
      client.managers.pull(personId);
    }
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
  const { type, severity, month, year } = filters;
  const clients = await Client.find({ status: 'ACTIVE' });
  const {
    calculateComplianceStatus,
    calculateNextVATSubmissionDate,
    calculateNextCorporateTaxSubmissionDate
  } = await import('../../services/compliance.service.js');

  // Default to current month/year if not provided
  const now = new Date();
  const filterMonth = month !== undefined ? parseInt(month, 10) : now.getMonth() + 1; // 1-12
  const filterYear = year !== undefined ? parseInt(year, 10) : now.getFullYear();

  // Helper function to check if a date falls within the specified month/year
  const isDateInMonthYear = (date) => {
    if (!date) return false;
    const d = new Date(date);
    return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
  };

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

    // Add VAT submission alert
    const vatSubmission = calculateNextVATSubmissionDate(client);
    if (vatSubmission) {
      const now = new Date();
      const daysUntilDue = vatSubmission.daysUntilDue || Math.floor((vatSubmission.submissionDate - now) / (1000 * 60 * 60 * 24));

      // Determine severity based on days until due
      let alertSeverity = 'LOW';
      if (daysUntilDue < 0) {
        alertSeverity = 'CRITICAL';
      } else if (daysUntilDue <= 7) {
        alertSeverity = 'HIGH';
      } else if (daysUntilDue <= 14) {
        alertSeverity = 'MEDIUM';
      }

      // Filter by type if specified
      if (!type || type.toLowerCase().includes('vat')) {
        // Filter by severity if specified
        if (!severity || alertSeverity === severity) {
          allAlerts.push({
            type: 'VAT_SUBMISSION_DUE',
            message: `VAT submission due for period ${vatSubmission.period ? `${formatDateDDMMYYYY(vatSubmission.period.startDate)} - ${formatDateDDMMYYYY(vatSubmission.period.endDate)}` : ''}`,
            severity: alertSeverity,
            clientId: client._id,
            clientName: client.name,
            dueDate: vatSubmission.submissionDate,
            daysUntilDue: daysUntilDue,
            category: 'VAT_CERTIFICATE',
          });
        }
      }
    }

    // Add Corporate Tax submission alert
    const corporateTaxSubmission = calculateNextCorporateTaxSubmissionDate(client);
    if (corporateTaxSubmission) {
      const daysUntilDue = corporateTaxSubmission.daysUntilDue || Math.floor((corporateTaxSubmission.submissionDate - new Date()) / (1000 * 60 * 60 * 24));

      // Determine severity based on days until due
      let alertSeverity = 'LOW';
      if (daysUntilDue < 0) {
        alertSeverity = 'CRITICAL';
      } else if (daysUntilDue <= 30) {
        alertSeverity = 'HIGH';
      } else if (daysUntilDue <= 60) {
        alertSeverity = 'MEDIUM';
      }

      // Filter by type if specified
      if (!type || type.toLowerCase().includes('corporate') || type.toLowerCase().includes('tax')) {
        // Filter by severity if specified
        if (!severity || alertSeverity === severity) {
          allAlerts.push({
            type: 'CORPORATE_TAX_SUBMISSION_DUE',
            message: 'Corporate Tax submission due',
            severity: alertSeverity,
            clientId: client._id,
            clientName: client.name,
            dueDate: corporateTaxSubmission.submissionDate,
            daysUntilDue: daysUntilDue,
            category: 'CORPORATE_TAX_CERTIFICATE',
          });
        }
      }
    }

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

  // Filter by month/year if specified
  let filteredAlerts = allAlerts;
  let filteredDeadlines = deadlines;

  if (month !== undefined || year !== undefined) {
    // Filter alerts by dueDate/expiryDate month/year
    filteredAlerts = allAlerts.filter((alert) => {
      const alertDate = alert.dueDate || alert.expiryDate;
      return isDateInMonthYear(alertDate);
    });

    // Filter deadlines by expiryDate month/year
    filteredDeadlines = deadlines.filter((deadline) => {
      const deadlineDate = deadline.expiryDate;
      return isDateInMonthYear(deadlineDate);
    });
  }

  // Sort deadlines by date (soonest first)
  filteredDeadlines.sort((a, b) => {
    const dateA = new Date(a.expiryDate);
    const dateB = new Date(b.expiryDate);
    return dateA - dateB;
  });

  // Sort alerts by severity and date
  filteredAlerts.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    const dateA = a.dueDate || a.expiryDate ? new Date(a.dueDate || a.expiryDate) : new Date(0);
    const dateB = b.dueDate || b.expiryDate ? new Date(b.dueDate || b.expiryDate) : new Date(0);
    return dateA - dateB;
  });

  return {
    alerts: filteredAlerts,
    deadlines: filteredDeadlines,
    totalAlerts: filteredAlerts.length,
    totalDeadlines: filteredDeadlines.length,
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

  // Handle password update:
  // - undefined: don't update password (keep existing)
  // - null or empty string: clear password
  // - string: update password (plain text)
  if (credentials.password !== undefined) {
    if (credentials.password === null || credentials.password === '') {
      // Clear password
      client.emaraTaxAccount.password = null;
    } else {
      // Update password (plain text)
      client.emaraTaxAccount.password = credentials.password;
    }
  }

  await client.save();
  return client;
};

/**
 * Sync extracted data from documents to managers/partners
 * This function copies Emirates ID and Passport data from processed documents to matching person records
 * @param {string} clientId - Client ID
 * @returns {Object} Client with synced data
 */
/**
 * Get next submission dates for all active clients
 * @returns {Object} Next VAT and Corporate Tax submission dates
 */
export const getNextSubmissionDates = async () => {
  const clients = await Client.find({ status: 'ACTIVE' }).select('businessInfo name');

  const { calculateNextVATSubmissionDate, calculateNextCorporateTaxSubmissionDate } = await import('../../services/compliance.service.js');

  let nextVATDate = null;
  let nextCorporateTaxDate = null;

  for (const client of clients) {
    // Get next VAT submission date
    const vatSubmission = calculateNextVATSubmissionDate(client);
    if (vatSubmission && (!nextVATDate || vatSubmission.submissionDate < nextVATDate.submissionDate)) {
      nextVATDate = {
        ...vatSubmission,
        clientName: client.name,
        clientId: client._id,
      };
    }

    // Get next Corporate Tax submission date
    const corporateTaxSubmission = calculateNextCorporateTaxSubmissionDate(client);
    if (corporateTaxSubmission && (!nextCorporateTaxDate || corporateTaxSubmission.submissionDate < nextCorporateTaxDate.submissionDate)) {
      nextCorporateTaxDate = {
        ...corporateTaxSubmission,
        clientName: client.name,
        clientId: client._id,
      };
    }
  }

  return {
    nextVATSubmission: nextVATDate,
    nextCorporateTaxSubmission: nextCorporateTaxDate,
  };
};

export const syncDocumentDataToPersons = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Helper function to normalize names for comparison
  const normalizeName = (name) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(word => word.length > 0);
  };

  // Check if two words are similar
  const wordsMatch = (word1, word2) => {
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();

    if (w1 === w2) return true;

    if (w1.includes(w2) || w2.includes(w1)) {
      const minLength = Math.min(w1.length, w2.length);
      if (minLength >= 4) return true;
    }

    if (w1.length >= 5 && w2.length >= 5) {
      let matches = 0;
      const maxLen = Math.max(w1.length, w2.length);
      for (let i = 0; i < Math.min(w1.length, w2.length); i++) {
        if (w1[i] === w2[i]) matches++;
      }
      if (matches / maxLen >= 0.8) return true;
    }

    return false;
  };

  // Check if two names match
  const checkNameMatch = (name1, name2) => {
    if (!name1 || !name2) return false;

    if (name1.trim().toLowerCase() === name2.trim().toLowerCase()) {
      return true;
    }

    const words1 = normalizeName(name1);
    const words2 = normalizeName(name2);

    const sortedWords1 = [...words1].sort();
    const sortedWords2 = [...words2].sort();

    if (sortedWords1.length === sortedWords2.length) {
      const sortedMatch = sortedWords1.every((word, idx) =>
        wordsMatch(word, sortedWords2[idx])
      );
      if (sortedMatch) return true;
    }

    const shorterWords = words1.length <= words2.length ? words1 : words2;
    const longerWords = words1.length > words2.length ? words1 : words2;

    const allWordsMatch = shorterWords.every(shortWord =>
      longerWords.some(longWord => wordsMatch(shortWord, longWord))
    );

    if (allWordsMatch) return true;

    const getKeyWords = (words) => {
      if (words.length === 0) return [];
      if (words.length === 1) return words;
      return [words[0], words[words.length - 1]];
    };

    const keyWords1 = getKeyWords(words1);
    const keyWords2 = getKeyWords(words2);

    const keyWordsMatch = keyWords1.length > 0 && keyWords2.length > 0 &&
      keyWords1.some(kw1 => keyWords2.some(kw2 => wordsMatch(kw1, kw2)));

    return keyWordsMatch;
  };

  let syncedCount = 0;

  // Process all person documents (Emirates ID and Passport)
  for (const document of client.documents) {
    if (
      (document.category.includes('EMIRATES_ID') || document.category.includes('PASSPORT')) &&
      document.extractedData &&
      document.extractedData.name?.value
    ) {
      const extractedData = document.extractedData;
      const extractedName = extractedData.name.value;

      // Determine role from document category
      const isManager = document.category.includes('MANAGER');
      const isPartner = document.category.includes('PARTNER');
      const personArray = isManager ? client.managers : isPartner ? client.partners : null;

      if (personArray) {
        // Find matching person
        const matchingPerson = personArray.find(
          (person) => person.name && checkNameMatch(extractedName, person.name)
        );

        if (matchingPerson) {
          let updated = false;

          // Copy Emirates ID data
          if (document.category.includes('EMIRATES_ID')) {
            if (extractedData.idNumber?.value && !matchingPerson.emiratesId.number) {
              matchingPerson.emiratesId.number = extractedData.idNumber.value;
              updated = true;
            }
            if (extractedData.issueDate?.value && !matchingPerson.emiratesId.issueDate) {
              matchingPerson.emiratesId.issueDate = new Date(extractedData.issueDate.value);
              updated = true;
            }
            if (extractedData.expiryDate?.value && !matchingPerson.emiratesId.expiryDate) {
              matchingPerson.emiratesId.expiryDate = new Date(extractedData.expiryDate.value);
              updated = true;
            }
          }

          // Copy Passport data
          if (document.category.includes('PASSPORT')) {
            if (extractedData.passportNumber?.value && !matchingPerson.passport.number) {
              matchingPerson.passport.number = extractedData.passportNumber.value;
              updated = true;
            }
            if (extractedData.issueDate?.value && !matchingPerson.passport.issueDate) {
              matchingPerson.passport.issueDate = new Date(extractedData.issueDate.value);
              updated = true;
            }
            if (extractedData.expiryDate?.value && !matchingPerson.passport.expiryDate) {
              matchingPerson.passport.expiryDate = new Date(extractedData.expiryDate.value);
              updated = true;
            }
          }

          if (updated) {
            matchingPerson.updatedAt = new Date();
            syncedCount++;
          }
        }
      }
    }
  }

  if (syncedCount > 0) {
    await client.save();
  }

  return { client, syncedCount };
};

/**
 * Get calendar events for all active clients
 * @param {Date} startDate - Start date for events
 * @param {Date} endDate - End date for events
 * @param {string} clientId - Optional client ID filter
 * @returns {Array} Array of calendar events
 */
export const getCalendarEvents = async (startDate, endDate, clientId = null) => {
  const query = { status: 'ACTIVE' };
  if (clientId) {
    query._id = clientId;
  }

  const clients = await Client.find(query).select('name businessInfo partners managers');

  const { calculateNextVATSubmissionDate, calculateNextCorporateTaxSubmissionDate } = await import('../../services/compliance.service.js');

  const events = [];
  const now = new Date();
  const vatFilingDaysAfterPeriod = 28;

  // Helper to get last day of month
  const getLastDayOfMonth = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return d;
  };

  // Helper to generate recurring VAT submission dates
  const generateVATSubmissions = (client, monthsAhead = 12) => {
    const submissions = [];
    const endDateObj = new Date(endDate);
    const maxDate = new Date(now);
    maxDate.setMonth(maxDate.getMonth() + monthsAhead);

    if (!client.businessInfo) return submissions;

    // Use tax periods if available
    if (client.businessInfo.vatTaxPeriods && client.businessInfo.vatTaxPeriods.length > 0) {
      const vatTaxPeriods = client.businessInfo.vatTaxPeriods;
      const sortedPeriods = [...vatTaxPeriods].sort((a, b) =>
        new Date(a.startDate) - new Date(b.startDate)
      );

      // Generate submissions for the next monthsAhead months
      // Calculate how many cycles we need to generate
      const cyclesNeeded = Math.ceil(monthsAhead / (12 / sortedPeriods.length)) + 1;
      const generatedDates = new Set();
      const currentYear = now.getFullYear();

      // Generate submissions for current year and next year
      for (let yearOffset = 0; yearOffset <= cyclesNeeded; yearOffset++) {
        for (const period of sortedPeriods) {
          const periodStart = new Date(period.startDate);
          const periodEnd = new Date(period.endDate);

          const targetPeriodStart = new Date(periodStart);
          targetPeriodStart.setFullYear(currentYear + yearOffset);

          const targetPeriodEnd = new Date(periodEnd);
          targetPeriodEnd.setFullYear(currentYear + yearOffset);

          const submissionDate = new Date(targetPeriodEnd);
          submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

          // Only add if within date range and not already added
          const dateKey = submissionDate.toISOString().split('T')[0];
          if (
            submissionDate >= startDate &&
            submissionDate <= endDateObj &&
            !generatedDates.has(dateKey)
          ) {
            generatedDates.add(dateKey);
            submissions.push({
              submissionDate: new Date(submissionDate),
              period: {
                startDate: targetPeriodStart,
                endDate: targetPeriodEnd,
              },
            });
          }
        }
      }
    } else if (client.businessInfo.vatReturnCycle) {
      // Fallback to cycle-based calculation
      const cycle = client.businessInfo.vatReturnCycle;
      let currentDate = new Date(now);

      if (cycle === 'MONTHLY') {
        while (currentDate <= maxDate) {
          const periodEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          const submissionDate = new Date(periodEndDate);
          submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

          if (submissionDate >= startDate && submissionDate <= endDateObj) {
            submissions.push({
              submissionDate: new Date(submissionDate),
              period: {
                startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                endDate: periodEndDate,
              },
            });
          }

          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else if (cycle === 'QUARTERLY') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        let quarter = currentQuarter;
        let year = now.getFullYear();
        const generatedDates = new Set();

        // Generate for up to 4 quarters ahead (1 year)
        for (let i = 0; i < 4; i++) {
          const quarterEndMonth = (quarter + 1) * 3 - 1;
          const periodEndDate = new Date(year, quarterEndMonth + 1, 0);
          const submissionDate = new Date(periodEndDate);
          submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

          const dateKey = submissionDate.toISOString().split('T')[0];
          if (
            submissionDate >= startDate &&
            submissionDate <= endDateObj &&
            !generatedDates.has(dateKey)
          ) {
            generatedDates.add(dateKey);
            submissions.push({
              submissionDate: new Date(submissionDate),
              period: {
                startDate: new Date(year, quarterEndMonth - 2, 1),
                endDate: periodEndDate,
              },
            });
          }

          quarter = (quarter + 1) % 4;
          if (quarter === 0) {
            year++;
          }
        }
      }
    }

    return submissions.sort((a, b) => a.submissionDate - b.submissionDate);
  };

  for (const client of clients) {
    const clientIdStr = client._id.toString();

    // Corporate Tax Renewal
    if (client.businessInfo?.corporateTaxDueDate) {
      const dueDate = new Date(client.businessInfo.corporateTaxDueDate);
      let eventDate = dueDate;

      // If due date has passed, calculate next year
      if (dueDate < now) {
        eventDate = new Date(dueDate);
        eventDate.setFullYear(eventDate.getFullYear() + 1);
      }

      if (eventDate >= startDate && eventDate <= endDate) {
        events.push({
          id: `corporate-tax-${clientIdStr}`,
          title: `Corporate Tax - ${client.name}`,
          start: eventDate,
          end: eventDate,
          allDay: true,
          type: 'CORPORATE_TAX',
          clientId: clientIdStr,
          clientName: client.name,
          metadata: {
            dueDate: eventDate,
          },
        });
      }
    } else {
      // Fallback to last day of current month
      const lastDay = getLastDayOfMonth(now);
      if (lastDay >= startDate && lastDay <= endDate) {
        events.push({
          id: `corporate-tax-${clientIdStr}`,
          title: `Corporate Tax - ${client.name}`,
          start: lastDay,
          end: lastDay,
          allDay: true,
          type: 'CORPORATE_TAX',
          clientId: clientIdStr,
          clientName: client.name,
          metadata: {
            isFallback: true,
          },
        });
      }
    }

    // VAT Submissions (recurring for 12 months)
    const vatSubmissions = generateVATSubmissions(client, 12);
    for (const submission of vatSubmissions) {
      events.push({
        id: `vat-${clientIdStr}-${submission.submissionDate.toISOString()}`,
        title: `VAT Submission - ${client.name}`,
        start: submission.submissionDate,
        end: submission.submissionDate,
        allDay: true,
        type: 'VAT_SUBMISSION',
        clientId: clientIdStr,
        clientName: client.name,
        metadata: {
          period: submission.period,
        },
      });
    }

    // Passport Expiry - Partners
    for (const partner of client.partners || []) {
      if (partner.passport?.expiryDate) {
        const expiryDate = new Date(partner.passport.expiryDate);
        if (expiryDate >= startDate && expiryDate <= endDate) {
          events.push({
            id: `passport-partner-${clientIdStr}-${partner._id}`,
            title: `Passport Expiry - ${partner.name} (${client.name})`,
            start: expiryDate,
            end: expiryDate,
            allDay: true,
            type: 'PASSPORT_EXPIRY',
            clientId: clientIdStr,
            clientName: client.name,
            metadata: {
              personName: partner.name,
              personId: partner._id.toString(),
              role: 'PARTNER',
            },
          });
        }
      }
    }

    // Passport Expiry - Managers
    for (const manager of client.managers || []) {
      if (manager.passport?.expiryDate) {
        const expiryDate = new Date(manager.passport.expiryDate);
        if (expiryDate >= startDate && expiryDate <= endDate) {
          events.push({
            id: `passport-manager-${clientIdStr}-${manager._id}`,
            title: `Passport Expiry - ${manager.name} (${client.name})`,
            start: expiryDate,
            end: expiryDate,
            allDay: true,
            type: 'PASSPORT_EXPIRY',
            clientId: clientIdStr,
            clientName: client.name,
            metadata: {
              personName: manager.name,
              personId: manager._id.toString(),
              role: 'MANAGER',
            },
          });
        }
      }
    }

    // EID Expiry - Partners
    for (const partner of client.partners || []) {
      if (partner.emiratesId?.expiryDate) {
        const expiryDate = new Date(partner.emiratesId.expiryDate);
        if (expiryDate >= startDate && expiryDate <= endDate) {
          events.push({
            id: `eid-partner-${clientIdStr}-${partner._id}`,
            title: `EID Expiry - ${partner.name} (${client.name})`,
            start: expiryDate,
            end: expiryDate,
            allDay: true,
            type: 'EID_EXPIRY',
            clientId: clientIdStr,
            clientName: client.name,
            metadata: {
              personName: partner.name,
              personId: partner._id.toString(),
              role: 'PARTNER',
            },
          });
        }
      }
    }

    // EID Expiry - Managers
    for (const manager of client.managers || []) {
      if (manager.emiratesId?.expiryDate) {
        const expiryDate = new Date(manager.emiratesId.expiryDate);
        if (expiryDate >= startDate && expiryDate <= endDate) {
          events.push({
            id: `eid-manager-${clientIdStr}-${manager._id}`,
            title: `EID Expiry - ${manager.name} (${client.name})`,
            start: expiryDate,
            end: expiryDate,
            allDay: true,
            type: 'EID_EXPIRY',
            clientId: clientIdStr,
            clientName: client.name,
            metadata: {
              personName: manager.name,
              personId: manager._id.toString(),
              role: 'MANAGER',
            },
          });
        }
      }
    }
  }

  // Sort events by date
  return events.sort((a, b) => a.start - b.start);
};

