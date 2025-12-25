import TimeEntry from './timeEntry.model.js';
import Task from '../task/task.model.js';
import Package from '../package/package.model.js';

export const createTimeEntry = async (timeEntryData, userId, userRole) => {
  // Verify task exists and belongs to package
  const task = await Task.findById(timeEntryData.taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  if (task.packageId.toString() !== timeEntryData.packageId) {
    throw new Error('Task does not belong to the specified package');
  }

  // Verify package belongs to client
  const packageDoc = await Package.findById(timeEntryData.packageId);
  if (!packageDoc) {
    throw new Error('Package not found');
  }

  if (packageDoc.clientId.toString() !== timeEntryData.clientId) {
    throw new Error('Package does not belong to the specified client');
  }

  // If user is EMPLOYEE, ensure they can only log their own time
  if (userRole === 'EMPLOYEE') {
    // Get user's employeeId
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (user.employeeId.toString() !== timeEntryData.employeeId) {
      throw new Error('Employees can only log time for themselves');
    }
  }

  const timeEntry = await TimeEntry.create(timeEntryData);
  return timeEntry;
};

export const getTimeEntries = async (filters = {}) => {
  const {
    employeeId,
    clientId,
    packageId,
    taskId,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = filters;

  const query = {};

  if (employeeId) {
    query.employeeId = employeeId;
  }

  if (clientId) {
    query.clientId = clientId;
  }

  if (packageId) {
    query.packageId = packageId;
  }

  if (taskId) {
    query.taskId = taskId;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      query.date.$lte = new Date(endDate);
    }
  }

  const skip = (page - 1) * limit;

  const [timeEntries, total] = await Promise.all([
    TimeEntry.find(query)
      .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
      .populate('clientId', 'name')
      .populate('packageId', 'name type')
      .populate('taskId', 'name category')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TimeEntry.countDocuments(query),
  ]);

  return {
    timeEntries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getTimeEntryById = async (timeEntryId) => {
  const timeEntry = await TimeEntry.findById(timeEntryId)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');

  if (!timeEntry) {
    throw new Error('Time entry not found');
  }
  return timeEntry;
};

export const updateTimeEntry = async (timeEntryId, updateData, userId, userRole) => {
  const currentEntry = await TimeEntry.findById(timeEntryId);
  if (!currentEntry) {
    throw new Error('Time entry not found');
  }

  // If user is EMPLOYEE, ensure they can only update their own time
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (currentEntry.employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('Employees can only update their own time entries');
    }

    // Prevent employees from changing employeeId
    if (updateData.employeeId && updateData.employeeId !== currentEntry.employeeId.toString()) {
      throw new Error('Employees cannot change the employee ID');
    }
  }

  // If relationships are being updated, verify them
  if (updateData.taskId || updateData.packageId || updateData.clientId) {
    const taskId = updateData.taskId || currentEntry.taskId;
    const packageId = updateData.packageId || currentEntry.packageId;
    const clientId = updateData.clientId || currentEntry.clientId;

    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.packageId.toString() !== packageId.toString()) {
      throw new Error('Task does not belong to the specified package');
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
      throw new Error('Package not found');
    }

    if (packageDoc.clientId.toString() !== clientId.toString()) {
      throw new Error('Package does not belong to the specified client');
    }
  }

  const timeEntry = await TimeEntry.findByIdAndUpdate(timeEntryId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');

  return timeEntry;
};

export const deleteTimeEntry = async (timeEntryId, userId, userRole) => {
  const timeEntry = await TimeEntry.findById(timeEntryId);
  if (!timeEntry) {
    throw new Error('Time entry not found');
  }

  // If user is EMPLOYEE, ensure they can only delete their own time
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (timeEntry.employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('Employees can only delete their own time entries');
    }
  }

  await TimeEntry.findByIdAndDelete(timeEntryId);
  return timeEntry;
};

export const startTimer = async (timerData, userId, userRole) => {
  // If user is EMPLOYEE, ensure they can only start timer for themselves
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (timerData.employeeId && timerData.employeeId !== user.employeeId.toString()) {
      throw new Error('Employees can only start timer for themselves');
    }
    timerData.employeeId = user.employeeId.toString();
  }

  // Check if there's already a running timer for this employee
  const runningTimer = await TimeEntry.findOne({
    employeeId: timerData.employeeId,
    isRunning: true,
  });

  if (runningTimer) {
    throw new Error('There is already a running timer for this employee. Please stop it first.');
  }

  // Verify task exists and belongs to package
  const task = await Task.findById(timerData.taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  if (task.packageId.toString() !== timerData.packageId) {
    throw new Error('Task does not belong to the specified package');
  }

  // Verify package belongs to client
  const packageDoc = await Package.findById(timerData.packageId);
  if (!packageDoc) {
    throw new Error('Package not found');
  }

  if (packageDoc.clientId.toString() !== timerData.clientId) {
    throw new Error('Package does not belong to the specified client');
  }

  const now = new Date();
  const timerEntry = await TimeEntry.create({
    ...timerData,
    date: timerData.date || now,
    startTime: now,
    timerStartedAt: now,
    isRunning: true,
    minutesSpent: 0, // Will be calculated when stopped
  });

  return timerEntry;
};

export const stopTimer = async (timerId, userId, userRole) => {
  const timerEntry = await TimeEntry.findById(timerId);
  if (!timerEntry) {
    throw new Error('Timer not found');
  }

  if (!timerEntry.isRunning) {
    throw new Error('Timer is not running');
  }

  // If user is EMPLOYEE, ensure they can only stop their own timer
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (timerEntry.employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('Employees can only stop their own timers');
    }
  }

  const now = new Date();
  const startTime = timerEntry.timerStartedAt || timerEntry.startTime || timerEntry.createdAt;
  const minutesSpent = Math.floor((now - new Date(startTime)) / (1000 * 60));

  timerEntry.endTime = now;
  timerEntry.isRunning = false;
  timerEntry.minutesSpent = minutesSpent;
  await timerEntry.save();

  return timerEntry;
};

export const getRunningTimer = async (employeeId) => {
  const timer = await TimeEntry.findOne({
    employeeId,
    isRunning: true,
  })
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');

  return timer;
};

