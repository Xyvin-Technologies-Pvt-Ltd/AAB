import mongoose from 'mongoose';

const timeEntrySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client ID is required'],
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package ID is required'],
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    minutesSpent: {
      type: Number,
      required: [true, 'Minutes spent is required'],
      min: [1, 'Minutes spent must be at least 1'],
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
    timerStartedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
timeEntrySchema.index({ employeeId: 1, date: -1 });
timeEntrySchema.index({ packageId: 1, date: -1 });
timeEntrySchema.index({ clientId: 1, date: -1 });
timeEntrySchema.index({ employeeId: 1, isRunning: 1 });

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

export default TimeEntry;

