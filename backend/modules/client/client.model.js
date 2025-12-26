import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

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
      required: true,
      trim: true,
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
      required: [true, 'Client name is required'],
      unique: true,
      trim: true,
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
        select: false, // Don't return password by default
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

// Encrypt EmaraTax password before saving
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'default-encryption-key';
  if (!key) {
    // Generate a key if not set (should be set in production)
    const generatedKey = crypto.randomBytes(32).toString('hex');
    console.warn('WARNING: ENCRYPTION_KEY not set in environment. Using generated key (not persistent).');
    return generatedKey;
  }
  // Ensure key is 64 hex characters (32 bytes)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return key;
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-cbc';

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (text) => {
  if (!text) return null;
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

clientSchema.pre('save', async function (next) {
  // Only encrypt password if it's modified and not already encrypted
  if (this.isModified('emaraTaxAccount.password') && this.emaraTaxAccount?.password) {
    // Check if password is already encrypted (encrypted strings have format iv:encrypted)
    if (!this.emaraTaxAccount.password.includes(':')) {
      this.emaraTaxAccount.password = encrypt(this.emaraTaxAccount.password);
    }
  }
  next();
});

// Add method to decrypt password
clientSchema.methods.getDecryptedPassword = function () {
  if (!this.emaraTaxAccount?.password) return null;
  return decrypt(this.emaraTaxAccount.password);
};

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

