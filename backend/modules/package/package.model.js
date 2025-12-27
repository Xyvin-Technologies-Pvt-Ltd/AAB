import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['RECURRING', 'ONE_TIME'],
      required: [true, 'Package type is required'],
    },
    billingFrequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
      required: function () {
        return this.type === 'RECURRING';
      },
    },
    contractValue: {
      type: Number,
      required: [true, 'Contract value is required'],
      min: [0, 'Contract value must be positive'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    activities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for monthly revenue (computed based on billingFrequency)
packageSchema.virtual('monthlyRevenue').get(function () {
  if (!this.contractValue || this.contractValue <= 0) {
    return 0;
  }

  if (this.type === 'ONE_TIME') {
    // For one-time packages, divide by 12 to get monthly equivalent
    return this.contractValue / 12;
  }

  // For recurring packages, normalize based on billing frequency
  switch (this.billingFrequency) {
    case 'MONTHLY':
      return this.contractValue;
    case 'QUARTERLY':
      return this.contractValue / 3;
    case 'YEARLY':
      return this.contractValue / 12;
    default:
      return 0;
  }
});

// Ensure virtuals are included in JSON
packageSchema.set('toJSON', { virtuals: true });
packageSchema.set('toObject', { virtuals: true });

const Package = mongoose.model('Package', packageSchema);

export default Package;

