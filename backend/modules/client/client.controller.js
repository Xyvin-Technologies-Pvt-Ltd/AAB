import { successResponse } from '../../helpers/response.js';
import * as clientService from './client.service.js';
import logger from '../../helpers/logger.js';

export const createClient = async (req, res, next) => {
  try {
    const client = await clientService.createClient(req.body);
    return successResponse(res, 201, 'Client created successfully', client);
  } catch (error) {
    next(error);
  }
};

export const getClients = async (req, res, next) => {
  try {
    // Handle vatMonths as array (can be comma-separated string or array)
    let vatMonths = [];
    if (req.query.vatMonths) {
      if (Array.isArray(req.query.vatMonths)) {
        vatMonths = req.query.vatMonths;
      } else if (typeof req.query.vatMonths === 'string') {
        vatMonths = req.query.vatMonths.split(',').filter((m) => m.trim() !== '');
      }
    }

    const filters = {
      search: req.query.search,
      status: req.query.status,
      vatMonths: vatMonths.length > 0 ? vatMonths : undefined,
      packageId: req.query.packageId,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await clientService.getClients(filters);
    return successResponse(res, 200, 'Clients retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    return successResponse(res, 200, 'Client retrieved successfully', client);
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    return successResponse(res, 200, 'Client updated successfully', client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    await clientService.deleteClient(req.params.id);
    return successResponse(res, 200, 'Client deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { uploadFile } = await import('../../helpers/s3Storage.js');
    const fileData = await uploadFile(req.file, 'clients');

    const documentData = {
      name: fileData.name,
      url: fileData.url,
      key: fileData.key,
      uploadedAt: new Date(),
    };

    const client = await clientService.addDocument(req.params.id, documentData);
    return successResponse(res, 200, 'Document uploaded successfully', client);
  } catch (error) {
    next(error);
  }
};

export const updateDocumentAssignment = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { personId } = req.body;

    const client = await clientService.updateDocumentAssignment(
      req.params.id,
      documentId,
      personId
    );

    logger.info('Document assignment updated', {
      clientId: req.params.id,
      documentId,
      personId,
      updatedBy: req.user._id,
    });

    return successResponse(res, 200, 'Document assignment updated successfully', client);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    // S3 deletion is handled in the service layer
    const { client } = await clientService.removeDocument(
      req.params.id,
      req.params.documentId
    );

    logger.info('Document deleted', {
      clientId: req.params.id,
      documentId: req.params.documentId,
      deletedBy: req.user._id,
    });

    return successResponse(res, 200, 'Document deleted successfully', client);
  } catch (error) {
    next(error);
  }
};

// Helper function to process a document
const processDocumentHelper = async (clientId, documentId) => {
  const client = await clientService.getClientById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const document = client.documents.id(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Update processing status
  document.processingStatus = 'PROCESSING';
  await client.save();

  try {
    const {
      processDocument: processDoc,
      mapExtractedDataToBusinessInfo,
      mapExtractedDataToPerson,
      validateNameConsistency,
    } = await import('../../services/documentProcessor.service.js');

    const { extractedData, processingMetadata } = await processDoc(
      document.category,
      document.key
    );

    // Check extraction quality for person documents
    if (
      document.category.includes('EMIRATES_ID') ||
      document.category.includes('PASSPORT')
    ) {
      const criticalField = document.category.includes('EMIRATES_ID')
        ? extractedData.idNumber?.value
        : extractedData.passportNumber?.value;

      if (!criticalField) {
        logger.warn('Critical field missing in extraction', {
          clientId,
          documentId,
          documentCategory: document.category,
          extractionMethod: processingMetadata.extractionMethod,
          averageConfidence: processingMetadata.averageConfidence,
          extractedFields: Object.keys(extractedData),
        });
      } else if (processingMetadata.averageConfidence < 0.7) {
        logger.warn('Low confidence extraction detected', {
          clientId,
          documentId,
          documentCategory: document.category,
          extractionMethod: processingMetadata.extractionMethod,
          averageConfidence: processingMetadata.averageConfidence,
          lowConfidenceFields: processingMetadata.lowConfidenceFields,
        });
      }

      logger.info('Person document extraction completed', {
        clientId,
        documentId,
        documentCategory: document.category,
        extractionMethod: processingMetadata.extractionMethod,
        hasCriticalField: !!criticalField,
        hasName: !!extractedData.name?.value,
        averageConfidence: processingMetadata.averageConfidence,
      });
    }

    // Validate name consistency across documents
    const validation = validateNameConsistency(client, extractedData, document.category);

    if (!validation.isValid) {
      logger.warn('Name validation errors detected', {
        clientId,
        documentId,
        errors: validation.errors,
      });
    }

    if (validation.warnings.length > 0) {
      logger.warn('Name validation warnings detected', {
        clientId,
        documentId,
        warnings: validation.warnings,
      });
    }

    // Map extracted data to client fields
    const { updates, aiExtractedFields } = mapExtractedDataToBusinessInfo(
      document.category,
      extractedData
    );

    // Update business info with extracted data
    if (Object.keys(updates).length > 0) {
      const businessInfoUpdate = {};
      Object.keys(updates).forEach((key) => {
        if (key.startsWith('businessInfo.')) {
          const field = key.replace('businessInfo.', '');
          businessInfoUpdate[field] = updates[key];
        } else if (key === 'name' || key === 'nameArabic') {
          businessInfoUpdate[key] = updates[key];
        }
      });

      if (Object.keys(businessInfoUpdate).length > 0) {
        // Track AI-extracted fields
        if (!client.businessInfo.aiExtractedFields) {
          client.businessInfo.aiExtractedFields = [];
        }
        aiExtractedFields.forEach((field) => {
          if (!client.businessInfo.aiExtractedFields.includes(field)) {
            client.businessInfo.aiExtractedFields.push(field);
          }
        });

        await clientService.updateBusinessInfo(clientId, businessInfoUpdate);
      }
    }

    // Refresh client data after business info update
    let updatedClient = await clientService.getClientById(clientId);

    // Handle person-specific documents (Emirates ID, Passport)
    if (
      document.category.includes('EMIRATES_ID') ||
      document.category.includes('PASSPORT')
    ) {
      const personUpdates = mapExtractedDataToPerson(document.category, extractedData);
      updatedClient.documents.id(documentId).extractedData = { ...extractedData, personUpdates };

      // If document is assigned to a person, update that person's data
      // No automatic name matching - only update if assignedToPerson is set
      if (document.assignedToPerson) {
        const isManager = document.category.includes('MANAGER');
        const isPartner = document.category.includes('PARTNER');
        const personArray = isManager ? updatedClient.managers : isPartner ? updatedClient.partners : null;

        if (personArray) {
          const person = personArray.id(document.assignedToPerson);
          if (person) {
            // Update person with extracted data
            if (personUpdates.name) {
              person.name = personUpdates.name;
            }

            if (document.category.includes('EMIRATES_ID')) {
              person.emiratesId = {
                number: personUpdates['emiratesId.number'] || person.emiratesId?.number || null,
                issueDate: personUpdates['emiratesId.issueDate'] || person.emiratesId?.issueDate || null,
                expiryDate: personUpdates['emiratesId.expiryDate'] || person.emiratesId?.expiryDate || null,
                verified: person.emiratesId?.verified || false,
              };
            }

            if (document.category.includes('PASSPORT')) {
              person.passport = {
                number: personUpdates['passport.number'] || person.passport?.number || null,
                issueDate: personUpdates['passport.issueDate'] || person.passport?.issueDate || null,
                expiryDate: personUpdates['passport.expiryDate'] || person.passport?.expiryDate || null,
                verified: person.passport?.verified || false,
              };
            }

            person.updatedAt = new Date();

            logger.info('Updated person record with extracted data', {
              clientId,
              documentId,
              documentCategory: document.category,
              personId: person._id,
              role: isManager ? 'MANAGER' : 'PARTNER',
            });
          }
        }
      }
    } else {
      updatedClient.documents.id(documentId).extractedData = {
        ...extractedData,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,
      };
    }

    updatedClient.documents.id(documentId).processingStatus = 'COMPLETED';
    updatedClient.documents.id(documentId).processedAt = new Date();
    await updatedClient.save();

    logger.info('Document processed successfully', {
      clientId,
      documentId,
      category: document.category,
      extractionMethod: processingMetadata.extractionMethod,
      averageConfidence: processingMetadata.averageConfidence,
      hasCriticalFields: processingMetadata.hasCriticalFields,
    });

    return updatedClient;
  } catch (processingError) {
    document.processingStatus = 'FAILED';
    document.processingError = processingError.message;
    await client.save();

    logger.error('Document processing failed', {
      clientId,
      documentId,
      error: processingError.message,
    });

    throw processingError;
  }
};

export const uploadDocumentByType = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const category = req.params.type;
    if (!category) {
      return res.status(400).json({ message: 'Document category is required' });
    }

    const validCategories = [
      'TRADE_LICENSE',
      'VAT_CERTIFICATE',
      'CORPORATE_TAX_CERTIFICATE',
      'EMIRATES_ID_PARTNER',
      'PASSPORT_PARTNER',
      'EMIRATES_ID_MANAGER',
      'PASSPORT_MANAGER',
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid document category' });
    }

    const { uploadFile } = await import('../../helpers/s3Storage.js');
    const fileData = await uploadFile(req.file, 'clients');

    const documentData = {
      name: fileData.name,
      url: fileData.url,
      key: fileData.key,
      uploadedAt: new Date(),
    };

    // Extract personId from request body if provided (for partner/manager documents)
    const personId = req.body.personId || null;

    const client = await clientService.uploadDocumentByType(
      req.params.id,
      category,
      documentData,
      req.user._id,
      personId
    );

    // Get the uploaded document ID
    // For person documents, find by category and personId; for company documents, find by category only
    const uploadedDocument = personId
      ? client.documents.find(
        (doc) => doc.category === category && doc.assignedToPerson?.toString() === personId.toString()
      )
      : client.documents.find((doc) => doc.category === category && !doc.assignedToPerson);
    if (uploadedDocument) {
      // Automatically process the document
      try {
        const processedClient = await processDocumentHelper(req.params.id, uploadedDocument._id);
        return successResponse(res, 200, 'Document uploaded and processed successfully', processedClient);
      } catch (processingError) {
        // Document uploaded but processing failed - still return success for upload
        logger.error('Document processing failed after upload', {
          clientId: req.params.id,
          documentId: uploadedDocument._id,
          error: processingError.message,
        });
        return successResponse(res, 200, 'Document uploaded successfully, but processing failed', client);
      }
    }

    return successResponse(res, 200, 'Document uploaded successfully', client);
  } catch (error) {
    next(error);
  }
};

export const processDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const updatedClient = await processDocumentHelper(req.params.id, documentId);

    return successResponse(res, 200, 'Document processed successfully', updatedClient);
  } catch (error) {
    if (error.message === 'Client not found' || error.message === 'Document not found') {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const verifyDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { verifiedFields } = req.body;

    const client = await clientService.verifyDocument(
      req.params.id,
      documentId,
      verifiedFields || [],
      req.user._id
    );

    logger.info('Document verified', {
      clientId: req.params.id,
      documentId,
      verifiedBy: req.user._id,
    });

    return successResponse(res, 200, 'Document verified successfully', client);
  } catch (error) {
    next(error);
  }
};

export const updateBusinessInfo = async (req, res, next) => {
  try {
    const client = await clientService.updateBusinessInfo(req.params.id, req.body);

    logger.info('Business info updated', {
      clientId: req.params.id,
      updatedBy: req.user._id,
    });

    return successResponse(res, 200, 'Business information updated successfully', client);
  } catch (error) {
    next(error);
  }
};

export const updateEmaraTaxCredentials = async (req, res, next) => {
  try {
    const client = await clientService.updateEmaraTaxCredentials(req.params.id, req.body);

    logger.info('EmaraTax credentials updated', {
      clientId: req.params.id,
      updatedBy: req.user._id,
    });

    return successResponse(res, 200, 'EmaraTax credentials updated successfully', client);
  } catch (error) {
    next(error);
  }
};

export const addPerson = async (req, res, next) => {
  try {
    // Extract role from URL path
    const role = req.path.includes('/partners') ? 'PARTNER' : 'MANAGER';
    const personData = { ...req.body, role };

    const client = await clientService.addPerson(req.params.id, personData);

    logger.info('Person added', {
      clientId: req.params.id,
      role,
      addedBy: req.user._id,
    });

    return successResponse(res, 201, 'Person added successfully', client);
  } catch (error) {
    next(error);
  }
};

export const updatePerson = async (req, res, next) => {
  try {
    const { personId } = req.params;
    // Extract role from URL path
    const role = req.path.includes('/partners') ? 'PARTNER' : 'MANAGER';

    const client = await clientService.updatePerson(req.params.id, personId, req.body, role);

    logger.info('Person updated', {
      clientId: req.params.id,
      personId,
      role,
      updatedBy: req.user._id,
    });

    return successResponse(res, 200, 'Person updated successfully', client);
  } catch (error) {
    next(error);
  }
};

export const removePerson = async (req, res, next) => {
  try {
    const { personId } = req.params;
    // Extract role from URL path
    const role = req.path.includes('/partners') ? 'PARTNER' : 'MANAGER';

    const client = await clientService.removePerson(req.params.id, personId, role);

    logger.info('Person removed', {
      clientId: req.params.id,
      personId,
      role,
      removedBy: req.user._id,
    });

    return successResponse(res, 200, 'Person removed successfully', client);
  } catch (error) {
    next(error);
  }
};

export const getComplianceStatus = async (req, res, next) => {
  try {
    const complianceStatus = await clientService.getComplianceStatus(req.params.id);
    return successResponse(res, 200, 'Compliance status retrieved successfully', complianceStatus);
  } catch (error) {
    next(error);
  }
};

export const getAllAlerts = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      severity: req.query.severity,
      month: req.query.month,
      year: req.query.year,
    };
    const result = await clientService.getAllAlerts(filters);
    return successResponse(res, 200, 'Alerts retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const syncDocumentDataToPersons = async (req, res, next) => {
  try {
    const { syncedCount } = await clientService.syncDocumentDataToPersons(req.params.id);

    logger.info('Document data synced to persons', {
      clientId: req.params.id,
      syncedCount,
    });

    return successResponse(res, 200, `Synced ${syncedCount} document(s) to person records`, {
      syncedCount,
    });
  } catch (error) {
    next(error);
  }
};

export const getNextSubmissionDates = async (req, res, next) => {
  try {
    const submissionDates = await clientService.getNextSubmissionDates();

    return successResponse(res, 200, 'Next submission dates retrieved successfully', submissionDates);
  } catch (error) {
    next(error);
  }
};

export const getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end, clientId } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const events = await clientService.getCalendarEvents(startDate, endDate, clientId || null);

    return successResponse(res, 200, 'Calendar events retrieved successfully', { events });
  } catch (error) {
    next(error);
  }
};

export const bulkUploadClients = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    // Check if file is CSV
    const fileExtension = req.file.originalname.toLowerCase().substring(
      req.file.originalname.lastIndexOf('.')
    );
    if (fileExtension !== '.csv') {
      return res.status(400).json({ message: 'Invalid file type. Please upload a CSV file.' });
    }

    // Process CSV file
    const results = await clientService.bulkCreateClientsFromCSV(req.file.buffer);

    logger.info('Bulk CSV upload completed', {
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
      uploadedBy: req.user._id,
    });

    return successResponse(res, 200, 'Bulk upload completed', results);
  } catch (error) {
    logger.error('Bulk CSV upload error', {
      error: error.message,
      stack: error.stack,
      uploadedBy: req.user._id,
    });
    next(error);
  }
};

