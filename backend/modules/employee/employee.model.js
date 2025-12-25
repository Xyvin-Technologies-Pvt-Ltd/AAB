import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    designation: {
      type: String,
      trim: true,
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate must be positive'],
    },
    monthlyCost: {
      type: Number,
      required: [true, 'Monthly cost is required'],
      min: [0, 'Monthly cost must be positive'],
    },
    monthlyWorkingHours: {
      type: Number,
      min: [1, 'Monthly working hours must be at least 1'],
      max: [744, 'Monthly working hours cannot exceed 744'],
    },
    documents: [
      {
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
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for hourly cost (computed, not stored)
employeeSchema.virtual('hourlyCost').get(function () {
  if (!this.monthlyWorkingHours || this.monthlyWorkingHours === 0) {
    return 0;
  }
  return this.monthlyCost / this.monthlyWorkingHours;
});

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;

