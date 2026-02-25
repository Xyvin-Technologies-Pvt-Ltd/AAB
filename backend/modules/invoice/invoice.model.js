import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
    },
    lineItems: [lineItemSchema],
    timeEntries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeEntry',
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'DRAFT',
    },
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ clientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ issueDate: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
