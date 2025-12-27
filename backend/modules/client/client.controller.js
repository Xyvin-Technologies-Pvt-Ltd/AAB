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
    const filters = {
      search: req.query.search,
      status: req.query.status,
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

export const deleteDocument = async (req, res, next) => {
  try {
    const { client, document } = await clientService.removeDocument(
      req.params.id,
      req.params.documentId
    );

    // Delete from S3
    const { deleteFile } = await import('../../helpers/s3Storage.js');
    await deleteFile(document.key);

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

    // Handle partner/manager extraction from business documents
    if (
      ['TRADE_LICENSE', 'VAT_CERTIFICATE', 'CORPORATE_TAX_CERTIFICATE'].includes(
        document.category
      )
    ) {
      // Extract manager name if available
      if (updates._managerName) {
        const existingManager = updatedClient.managers.find(
          (m) => m.name.toLowerCase() === updates._managerName.toLowerCase()
        );
        if (!existingManager) {
          await clientService.addPerson(clientId, {
            name: updates._managerName,
            role: 'MANAGER',
          });
          updatedClient = await clientService.getClientById(clientId);
        }
      }

      // Extract partners if available
      if (updates._partners && Array.isArray(updates._partners)) {
        for (const partnerName of updates._partners) {
          const existingPartner = updatedClient.partners.find(
            (p) => p.name.toLowerCase() === partnerName.toLowerCase()
          );
          if (!existingPartner) {
            await clientService.addPerson(clientId, {
              name: partnerName,
              role: 'PARTNER',
            });
          }
        }
        updatedClient = await clientService.getClientById(clientId);
      }
    }

    // Handle person-specific documents (Emirates ID, Passport)
    if (
      document.category.includes('EMIRATES_ID') ||
      document.category.includes('PASSPORT')
    ) {
      const personUpdates = mapExtractedDataToPerson(document.category, extractedData);
      updatedClient.documents.id(documentId).extractedData = { ...extractedData, personUpdates };

      const extractedName = extractedData.name?.value;
      if (extractedName) {
        const isManager = document.category.includes('MANAGER');
        const isPartner = document.category.includes('PARTNER');
        const personArray = isManager ? updatedClient.managers : isPartner ? updatedClient.partners : null;

        if (personArray) {
          const normalizeName = (name) => {
            return name
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .split(' ')
              .filter(word => word.length > 0);
          };

          const wordsMatch = (word1, word2) => {
            const w1 = word1.toLowerCase();
            const w2 = word2.toLowerCase();

            if (w1 === w2) return true;

            if (w1.includes(w2) || w2.includes(w1)) {
              const minLength = Math.min(w1.length, w2.length);
              if (minLength >= 4) {
                return true;
              }
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

          const matchingPerson = personArray.find(
            (person) => person.name && checkNameMatch(extractedName, person.name)
          );

          if (matchingPerson) {
            if (document.category.includes('EMIRATES_ID')) {
              if (extractedData.idNumber?.value) {
                matchingPerson.emiratesId.number = extractedData.idNumber.value;
              }
              if (extractedData.issueDate?.value) {
                matchingPerson.emiratesId.issueDate = new Date(extractedData.issueDate.value);
              }
              if (extractedData.expiryDate?.value) {
                matchingPerson.emiratesId.expiryDate = new Date(extractedData.expiryDate.value);
              }
            }

            if (document.category.includes('PASSPORT')) {
              if (extractedData.passportNumber?.value) {
                matchingPerson.passport.number = extractedData.passportNumber.value;
              }
              if (extractedData.issueDate?.value) {
                matchingPerson.passport.issueDate = new Date(extractedData.issueDate.value);
              }
              if (extractedData.expiryDate?.value) {
                matchingPerson.passport.expiryDate = new Date(extractedData.expiryDate.value);
              }
            }

            matchingPerson.updatedAt = new Date();

            logger.info('Copied extracted data to person record', {
              clientId,
              documentId,
              documentCategory: document.category,
              personName: extractedName,
              role: isManager ? 'MANAGER' : 'PARTNER',
              personId: matchingPerson._id,
            });
          } else {
            logger.warn('No matching person found for extracted name', {
              clientId,
              documentId,
              documentCategory: document.category,
              extractedName,
              role: isManager ? 'MANAGER' : 'PARTNER',
              availablePersons: personArray.map((p) => p.name),
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

    const client = await clientService.uploadDocumentByType(
      req.params.id,
      category,
      documentData,
      req.user._id
    );

    // Get the uploaded document ID
    const uploadedDocument = client.documents.find((doc) => doc.category === category);
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

