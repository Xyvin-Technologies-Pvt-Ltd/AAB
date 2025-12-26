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
        document.extractedData = { ...extractedData, personUpdates };
      } else {
        // Store validation results in extracted data
        document.extractedData = {
          ...extractedData,
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
        };
      }

      // Update document with extracted data
      if (
        document.category.includes('EMIRATES_ID') ||
        document.category.includes('PASSPORT')
      ) {
        const personUpdates = mapExtractedDataToPerson(document.category, extractedData);
        // Store person updates in document for later assignment
        updatedClient.documents.id(documentId).extractedData = { ...extractedData, personUpdates };
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
      });

      return successResponse(res, 200, 'Document processed successfully', {
        client: updatedClient,
        processingMetadata,
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

