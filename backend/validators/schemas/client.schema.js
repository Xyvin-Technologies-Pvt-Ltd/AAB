import Joi from 'joi';

export const createClientSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Client name is required',
  }),
  contactPerson: Joi.string().trim().allow('', null),
  email: Joi.string().email().trim().allow('', null).messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().trim().allow('', null),
  documents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      key: Joi.string().required(),
      uploadedAt: Joi.date(),
    })
  ),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE'),
});

export const updateClientSchema = Joi.object({
  name: Joi.string().trim(),
  contactPerson: Joi.string().trim().allow('', null),
  email: Joi.string().email().trim().allow('', null).messages({
    'string.email': 'Please provide a valid email',
  }),
  phone: Joi.string().trim().allow('', null),
  documents: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required(),
      key: Joi.string().required(),
      uploadedAt: Joi.date(),
    })
  ),
  status: Joi.string().valid('ACTIVE', 'INACTIVE'),
});

export const uploadDocumentSchema = Joi.object({
  category: Joi.string()
    .valid(
      'TRADE_LICENSE',
      'VAT_CERTIFICATE',
      'CORPORATE_TAX_CERTIFICATE',
      'EMIRATES_ID_PARTNER',
      'PASSPORT_PARTNER',
      'EMIRATES_ID_MANAGER',
      'PASSPORT_MANAGER'
    )
    .required()
    .messages({
      'any.required': 'Document category is required',
      'any.only': 'Invalid document category',
    }),
});

export const verifyDocumentSchema = Joi.object({
  verifiedFields: Joi.array().items(Joi.string()).optional(),
});

export const businessInfoSchema = Joi.object({
  name: Joi.string().trim().allow('', null),
  nameArabic: Joi.string().trim().allow('', null),
  address: Joi.string().trim().allow('', null),
  emirate: Joi.string().trim().allow('', null),
  trn: Joi.string().trim().allow('', null),
  ctrn: Joi.string().trim().allow('', null),
  vatReturnCycle: Joi.string().valid('MONTHLY', 'QUARTERLY', 'OTHER', null).allow(null),
  vatTaxPeriods: Joi.array()
    .items(
      Joi.object({
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
      })
    )
    .optional(),
  corporateTaxDueDate: Joi.date().allow(null),
  licenseNumber: Joi.string().trim().allow('', null),
  licenseStartDate: Joi.date().allow(null),
  licenseExpiryDate: Joi.date().allow(null),
  turnover: Joi.array()
    .items(
      Joi.object({
        year: Joi.number().integer().min(2000).max(2100).required(),
        amount: Joi.number().min(0).required(),
        currency: Joi.string().default('AED'),
      })
    )
    .optional(),
  remarks: Joi.string().trim().allow('', null),
  verifiedFields: Joi.array().items(Joi.string()).optional(),
});

export const personSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Name is required',
  }),
  role: Joi.string().valid('PARTNER', 'MANAGER').optional().messages({
    'any.only': 'Role must be either PARTNER or MANAGER',
  }),
  emiratesId: Joi.object({
    number: Joi.string().trim().allow('', null),
    issueDate: Joi.date().allow(null),
    expiryDate: Joi.date().allow(null),
    verified: Joi.boolean().default(false),
  }).optional(),
  passport: Joi.object({
    number: Joi.string().trim().allow('', null),
    issueDate: Joi.date().allow(null),
    expiryDate: Joi.date().allow(null),
    verified: Joi.boolean().default(false),
  }).optional(),
  // For managers: link to partner if they are the same person
  linkedPartnerId: Joi.string().trim().allow('', null).optional(),
});

export const updatePersonSchema = Joi.object({
  name: Joi.string().trim(),
  role: Joi.string().valid('PARTNER', 'MANAGER'),
  emiratesId: Joi.object({
    number: Joi.string().trim().allow('', null),
    issueDate: Joi.date().allow(null),
    expiryDate: Joi.date().allow(null),
    verified: Joi.boolean(),
  }).optional(),
  passport: Joi.object({
    number: Joi.string().trim().allow('', null),
    issueDate: Joi.date().allow(null),
    expiryDate: Joi.date().allow(null),
    verified: Joi.boolean(),
  }).optional(),
  // For managers: link to partner if they are the same person
  linkedPartnerId: Joi.string().trim().allow('', null).optional(),
});

export const emaraTaxCredentialsSchema = Joi.object({
  username: Joi.string().trim().allow('', null),
  password: Joi.string().allow('', null),
});

// Relaxed validation schema for bulk CSV upload
export const bulkCreateClientSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Client name is required',
  }),
  contactPerson: Joi.string().trim().allow('', null).optional(),
  email: Joi.string().trim().allow('', null).optional(),
  phone: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE').optional(),
  emaraTaxAccount: Joi.object({
    username: Joi.string().trim().allow('', null).optional(),
    password: Joi.string().allow('', null).optional(),
  }).optional(),
  businessInfo: Joi.object({
    address: Joi.string().trim().allow('', null).optional(),
    emirate: Joi.string().trim().allow('', null).optional(),
    trn: Joi.string().trim().allow('', null).optional(),
    ctrn: Joi.string().trim().allow('', null).optional(),
    vatReturnCycle: Joi.string().valid('MONTHLY', 'QUARTERLY', 'OTHER', null).allow(null).optional(),
    vatTaxPeriods: Joi.array()
      .items(
        Joi.object({
          startDate: Joi.date().required(),
          endDate: Joi.date().required(),
        })
      )
      .optional(),
    corporateTaxDueDate: Joi.date().allow(null).optional(),
    licenseNumber: Joi.string().trim().allow('', null).optional(),
    licenseStartDate: Joi.date().allow(null).optional(),
    licenseExpiryDate: Joi.date().allow(null).optional(),
    turnover: Joi.array()
      .items(
        Joi.object({
          year: Joi.number().integer().min(2000).max(2100).required(),
          amount: Joi.number().min(0).required(),
          currency: Joi.string().default('AED'),
        })
      )
      .optional(),
    remarks: Joi.string().trim().allow('', null).optional(),
  }).optional(),
}).unknown(true); // Allow unknown fields for flexibility

