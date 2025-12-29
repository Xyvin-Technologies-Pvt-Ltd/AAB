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
      required: false,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: false,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: false,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    minutesSpent: {
      type: Number,
      default: 0,
      min: 0,
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
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedAt: {
      type: Date,
    },
    accumulatedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    isMiscellaneous: {
      type: Boolean,
      default: false,
    },
    miscellaneousDescription: {
      type: String,
      trim: true,
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
timeEntrySchema.index({ employeeId: 1, isPaused: 1 });

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

export default TimeEntry;

