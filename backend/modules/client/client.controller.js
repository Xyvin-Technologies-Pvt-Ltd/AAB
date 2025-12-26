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
    
    // Check if user wants unmasked credentials (via query param)
    const showUnmasked = req.query.showCredentials === 'true';
    
    // Mask EmaraTax credentials in response (unless explicitly requested)
    if (client.emaraTaxAccount) {
      const { maskUsername, maskPassword } = await import('../../helpers/dataMasking.js');
      const hasPassword = !!client.emaraTaxAccount.password;
      
      let password = null;
      if (hasPassword) {
        if (showUnmasked) {
          // Decrypt password for display
          password = client.getDecryptedPassword();
        } else {
          password = maskPassword('placeholder');
        }
      }
      
      // Always return the actual username if it exists, only mask if not showing unmasked
      let username = null;
      if (client.emaraTaxAccount.username) {
        if (showUnmasked) {
          // Return actual username (should not be masked in DB)
          username = client.emaraTaxAccount.username;
        } else {
          // Mask username for display
          username = maskUsername(client.emaraTaxAccount.username);
        }
      }
      
      client.emaraTaxAccount = {
        username: username,
        password: password,
      };
    }
    
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

    return successResponse(res, 200, 'Document uploaded successfully', client);
  } catch (error) {
    next(error);
  }
};

export const processDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const client = await clientService.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const document = client.documents.id(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
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
            clientId: req.params.id,
            documentId,
            documentCategory: document.category,
            extractionMethod: processingMetadata.extractionMethod,
            averageConfidence: processingMetadata.averageConfidence,
            extractedFields: Object.keys(extractedData),
          });
        } else if (processingMetadata.averageConfidence < 0.7) {
          logger.warn('Low confidence extraction detected', {
            clientId: req.params.id,
            documentId,
            documentCategory: document.category,
            extractionMethod: processingMetadata.extractionMethod,
            averageConfidence: processingMetadata.averageConfidence,
            lowConfidenceFields: processingMetadata.lowConfidenceFields,
          });
        }

        // Log extraction success
        logger.info('Person document extraction completed', {
          clientId: req.params.id,
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
          clientId: req.params.id,
          documentId,
          errors: validation.errors,
        });
      }

      if (validation.warnings.length > 0) {
        logger.warn('Name validation warnings detected', {
          clientId: req.params.id,
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

          await clientService.updateBusinessInfo(req.params.id, businessInfoUpdate);
        }
      }

      // Refresh client data after business info update
      let updatedClient = await clientService.getClientById(req.params.id);

      // Handle partner/manager extraction from business documents
      if (
        ['TRADE_LICENSE', 'VAT_CERTIFICATE', 'CORPORATE_TAX_CERTIFICATE'].includes(
          document.category
        )
      ) {
        // Extract manager name if available
        if (updates._managerName) {
          // Check if manager already exists
          const existingManager = updatedClient.managers.find(
            (m) => m.name.toLowerCase() === updates._managerName.toLowerCase()
          );
          if (!existingManager) {
            // Create manager record (user can link documents later)
            await clientService.addPerson(req.params.id, {
              name: updates._managerName,
              role: 'MANAGER',
            });
            // Refresh client
            updatedClient = await clientService.getClientById(req.params.id);
          }
        }

        // Extract partners if available
        if (updates._partners && Array.isArray(updates._partners)) {
          for (const partnerName of updates._partners) {
            const existingPartner = updatedClient.partners.find(
              (p) => p.name.toLowerCase() === partnerName.toLowerCase()
            );
            if (!existingPartner) {
              await clientService.addPerson(req.params.id, {
                name: partnerName,
                role: 'PARTNER',
              });
            }
          }
          // Refresh client
          updatedClient = await clientService.getClientById(req.params.id);
        }
      }

      // Handle person-specific documents (Emirates ID, Passport)
      if (
        document.category.includes('EMIRATES_ID') ||
        document.category.includes('PASSPORT')
      ) {
        const personUpdates = mapExtractedDataToPerson(document.category, extractedData);
        // Store person updates in document for later assignment
        updatedClient.documents.id(documentId).extractedData = { ...extractedData, personUpdates };

        // Automatically copy extracted values to matching manager/partner
        const extractedName = extractedData.name?.value;
        if (extractedName) {
          // Determine role from document category
          const isManager = document.category.includes('MANAGER');
          const isPartner = document.category.includes('PARTNER');
          const personArray = isManager ? updatedClient.managers : isPartner ? updatedClient.partners : null;

          if (personArray) {
            // Helper function to normalize names for comparison
            const normalizeName = (name) => {
              return name
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' ') // Normalize whitespace
                .split(' ')
                .filter(word => word.length > 0); // Remove empty strings
            };

            // Check if two words are similar (handles typos, case differences, etc.)
            const wordsMatch = (word1, word2) => {
              const w1 = word1.toLowerCase();
              const w2 = word2.toLowerCase();
              
              // Exact match
              if (w1 === w2) return true;
              
              // One contains the other (handles "jinumon" vs "jinomon" if they're similar enough)
              if (w1.includes(w2) || w2.includes(w1)) {
                // Only consider it a match if the shorter word is at least 4 characters
                // This prevents false matches like "john" matching "johnson"
                const minLength = Math.min(w1.length, w2.length);
                if (minLength >= 4) {
                  return true;
                }
              }
              
              // Check similarity for longer words (handles "jinumon" vs "jinomon")
              if (w1.length >= 5 && w2.length >= 5) {
                // Calculate simple similarity: how many characters match
                let matches = 0;
                const maxLen = Math.max(w1.length, w2.length);
                for (let i = 0; i < Math.min(w1.length, w2.length); i++) {
                  if (w1[i] === w2[i]) matches++;
                }
                // If 80% of characters match, consider it a match
                if (matches / maxLen >= 0.8) return true;
              }
              
              return false;
            };

            const checkNameMatch = (name1, name2) => {
              if (!name1 || !name2) return false;
              
              // Exact match (case-insensitive)
              if (name1.trim().toLowerCase() === name2.trim().toLowerCase()) {
                return true;
              }

              // Normalize both names
              const words1 = normalizeName(name1);
              const words2 = normalizeName(name2);

              // Check if sorted words match (handles order differences like "JINUMON GOVINDAN" vs "GOVINDAN JINUMON")
              const sortedWords1 = [...words1].sort();
              const sortedWords2 = [...words2].sort();
              
              if (sortedWords1.length === sortedWords2.length) {
                const sortedMatch = sortedWords1.every((word, idx) => 
                  wordsMatch(word, sortedWords2[idx])
                );
                if (sortedMatch) return true;
              }

              // Check if all words from shorter name exist in longer name
              // This handles cases like "JINUMON GOVINDAN" vs "Jinomon Govindan Krishnan Govindan"
              const shorterWords = words1.length <= words2.length ? words1 : words2;
              const longerWords = words1.length > words2.length ? words1 : words2;

              // All words from shorter name must match a word in longer name
              const allWordsMatch = shorterWords.every(shortWord => 
                longerWords.some(longWord => wordsMatch(shortWord, longWord))
              );

              if (allWordsMatch) return true;

              // Check if key words match (first and last name typically)
              // Extract first and last words as key identifiers
              const getKeyWords = (words) => {
                if (words.length === 0) return [];
                if (words.length === 1) return words;
                // Return first and last words
                return [words[0], words[words.length - 1]];
              };

              const keyWords1 = getKeyWords(words1);
              const keyWords2 = getKeyWords(words2);
              
              // At least one key word from each name should match
              const keyWordsMatch = keyWords1.length > 0 && keyWords2.length > 0 &&
                keyWords1.some(kw1 => keyWords2.some(kw2 => wordsMatch(kw1, kw2)));

              return keyWordsMatch;
            };

            // Find matching person using improved name matching
            const matchingPerson = personArray.find(
              (person) => person.name && checkNameMatch(extractedName, person.name)
            );

            if (matchingPerson) {
              // Copy Emirates ID data if document is Emirates ID
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

              // Copy Passport data if document is Passport
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
                clientId: req.params.id,
                documentId,
                documentCategory: document.category,
                personName: extractedName,
                role: isManager ? 'MANAGER' : 'PARTNER',
                personId: matchingPerson._id,
              });
            } else {
              logger.warn('No matching person found for extracted name', {
                clientId: req.params.id,
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
        // Store validation results in extracted data
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
        clientId: req.params.id,
        documentId,
        category: document.category,
        extractionMethod: processingMetadata.extractionMethod,
        averageConfidence: processingMetadata.averageConfidence,
        hasCriticalFields: processingMetadata.hasCriticalFields,
      });

      // Include extraction quality warnings in response for person documents
      const extractionWarnings = [];
      if (
        document.category.includes('EMIRATES_ID') ||
        document.category.includes('PASSPORT')
      ) {
        if (!processingMetadata.hasCriticalFields) {
          extractionWarnings.push({
            type: 'missing_critical_field',
            message: `Critical field (${document.category.includes('EMIRATES_ID') ? 'ID Number' : 'Passport Number'}) was not extracted`,
          });
        }
        if (processingMetadata.averageConfidence < 0.7) {
          extractionWarnings.push({
            type: 'low_confidence',
            message: `Low average confidence (${(processingMetadata.averageConfidence * 100).toFixed(1)}%)`,
            lowConfidenceFields: processingMetadata.lowConfidenceFields,
          });
        }
      }

      return successResponse(res, 200, 'Document processed successfully', {
        client: updatedClient,
        processingMetadata: {
          ...processingMetadata,
          extractionWarnings: extractionWarnings.length > 0 ? extractionWarnings : undefined,
        },
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
      });
    } catch (processingError) {
      document.processingStatus = 'FAILED';
      document.processingError = processingError.message;
      await client.save();

      logger.error('Document processing failed', {
        clientId: req.params.id,
        documentId,
        error: processingError.message,
      });

      return res.status(500).json({
        message: 'Document processing failed',
        error: processingError.message,
      });
    }
  } catch (error) {
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

    // Mask credentials in response
    if (client.emaraTaxAccount) {
      const { maskUsername, maskPassword } = await import('../../helpers/dataMasking.js');
      const hasPassword = !!client.emaraTaxAccount.password;
      client.emaraTaxAccount = {
        username: client.emaraTaxAccount.username ? maskUsername(client.emaraTaxAccount.username) : null,
        password: hasPassword ? maskPassword('placeholder') : null,
      };
    }

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

