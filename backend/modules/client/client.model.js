import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'TRADE_LICENSE',
        'VAT_CERTIFICATE',
        'CORPORATE_TAX_CERTIFICATE',
        'EMIRATES_ID_PARTNER',
        'PASSPORT_PARTNER',
        'EMIRATES_ID_MANAGER',
        'PASSPORT_MANAGER',
      ],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    uploadStatus: {
      type: String,
      enum: ['PENDING', 'UPLOADED', 'VERIFIED'],
      default: 'UPLOADED',
    },
    processingStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    processingError: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    assignedToPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client.partners',
      default: null,
    },
  },
  { _id: true }
);

const personSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    role: {
      type: String,
      enum: ['PARTNER', 'MANAGER'],
      required: true,
    },
    emiratesId: {
      number: {
        type: String,
        trim: true,
        default: null,
      },
      issueDate: {
        type: Date,
        default: null,
      },
      expiryDate: {
        type: Date,
        default: null,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    passport: {
      number: {
        type: String,
        trim: true,
        default: null,
      },
      issueDate: {
        type: Date,
        default: null,
      },
      expiryDate: {
        type: Date,
        default: null,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    // For managers: link to partner if they are the same person
    linkedPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client.partners',
      default: null,
    },
  },
  { _id: true }
);

const turnoverRecordSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'AED',
  },
});

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allows multiple null/empty values while maintaining uniqueness for non-empty values
      trim: true,
      default: null,
    },
    nameArabic: {
      type: String,
      trim: true,
      default: null,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },
    // Business Information
    businessInfo: {
      address: {
        type: String,
        trim: true,
        default: null,
      },
      emirate: {
        type: String,
        trim: true,
        default: null,
      },
      trn: {
        type: String,
        trim: true,
        default: null,
      },
      ctrn: {
        type: String,
        trim: true,
        default: null,
      },
      vatReturnCycle: {
        type: String,
        enum: ['MONTHLY', 'QUARTERLY', 'OTHER', null],
        default: null,
      },
      vatTaxPeriods: {
        type: [
          {
            startDate: {
              type: Date,
              required: true,
            },
            endDate: {
              type: Date,
              required: true,
            },
          },
        ],
        default: [],
      },
      corporateTaxDueDate: {
        type: Date,
        default: null,
      },
      licenseNumber: {
        type: String,
        trim: true,
        default: null,
      },
      licenseStartDate: {
        type: Date,
        default: null,
      },
      licenseExpiryDate: {
        type: Date,
        default: null,
      },
      turnover: [turnoverRecordSchema],
      remarks: {
        type: String,
        trim: true,
        default: null,
      },
      // Track which fields were AI-extracted
      aiExtractedFields: {
        type: [String],
        default: [],
      },
      // Track which fields are verified
      verifiedFields: {
        type: [String],
        default: [],
      },
    },
    documents: [documentSchema],
    partners: [personSchema],
    managers: [personSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    // EmaraTax Account Credentials
    emaraTaxAccount: {
      username: {
        type: String,
        trim: true,
        default: null,
      },
      password: {
        type: String,
        default: null,
      },
    },
    // Compliance tracking
    compliance: {
      missingDocuments: {
        type: [String],
        default: [],
      },
      lastComplianceCheck: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);


// Indexes for performance
clientSchema.index({ 'businessInfo.trn': 1 });
clientSchema.index({ 'businessInfo.ctrn': 1 });
clientSchema.index({ 'businessInfo.licenseExpiryDate': 1 });
clientSchema.index({ 'documents.category': 1 });
clientSchema.index({ 'documents.uploadStatus': 1 });

// Helper method to get document by category
clientSchema.methods.getDocumentByCategory = function (category) {
  return this.documents.find((doc) => doc.category === category);
};

// Helper method to add or update document
clientSchema.methods.addOrUpdateDocument = function (documentData) {
  const existingDoc = this.documents.find(
    (doc) => doc.category === documentData.category && doc._id.toString() === documentData._id?.toString()
  );

  if (existingDoc) {
    Object.assign(existingDoc, documentData);
  } else {
    this.documents.push(documentData);
  }

  return this;
};

// Helper method to get compliance status
clientSchema.methods.getComplianceStatus = function () {
  const requiredCategories = [
    'TRADE_LICENSE',
    'VAT_CERTIFICATE',
    'CORPORATE_TAX_CERTIFICATE',
  ];

  const missingDocs = requiredCategories.filter(
    (cat) => !this.documents.some((doc) => doc.category === cat && doc.uploadStatus === 'VERIFIED')
  );

  return {
    missingDocuments: missingDocs,
    totalDocuments: this.documents.length,
    verifiedDocuments: this.documents.filter((doc) => doc.uploadStatus === 'VERIFIED').length,
  };
};

const Client = mongoose.model('Client', clientSchema);

export default Client;

