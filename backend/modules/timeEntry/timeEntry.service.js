import mongoose from 'mongoose';
import TimeEntry from './timeEntry.model.js';
import Task from '../task/task.model.js';
import Package from '../package/package.model.js';

export const createTimeEntry = async (timeEntryData, userId, userRole) => {
  // Only verify relationships if not miscellaneous
  if (!timeEntryData.isMiscellaneous) {
    // Verify task exists and belongs to package
    if (timeEntryData.taskId) {
      const task = await Task.findById(timeEntryData.taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (timeEntryData.packageId && task.packageId.toString() !== timeEntryData.packageId) {
        throw new Error('Task does not belong to the specified package');
      }

      // Verify package belongs to client
      if (timeEntryData.packageId) {
        const packageDoc = await Package.findById(timeEntryData.packageId);
        if (!packageDoc) {
          throw new Error('Package not found');
        }

        if (timeEntryData.clientId && packageDoc.clientId.toString() !== timeEntryData.clientId) {
          throw new Error('Package does not belong to the specified client');
        }
      }
    }
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
    isMiscellaneous,
    _teamFilter,
    page = 1,
    limit = 10,
    search = '',
  } = filters;

  const query = {};

  // Apply team-based filtering if provided
  if (_teamFilter && _teamFilter.length > 0) {
    query.employeeId = { $in: _teamFilter };
  } else if (employeeId) {
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

  if (isMiscellaneous !== undefined && isMiscellaneous !== null) {
    query.isMiscellaneous = isMiscellaneous;
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

  let timeEntriesQuery = TimeEntry.find(query)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category')
    .sort({ date: -1, createdAt: -1 });

  // Apply search filter if provided
  if (search) {
    // Search in populated fields - we'll filter after population
    const allEntries = await timeEntriesQuery.lean();
    const searchLower = search.toLowerCase();
    const filteredEntries = allEntries.filter((entry) => {
      return (
        entry.employeeId?.name?.toLowerCase().includes(searchLower) ||
        entry.clientId?.name?.toLowerCase().includes(searchLower) ||
        entry.packageId?.name?.toLowerCase().includes(searchLower) ||
        entry.taskId?.name?.toLowerCase().includes(searchLower) ||
        entry.miscellaneousDescription?.toLowerCase().includes(searchLower) ||
        entry.description?.toLowerCase().includes(searchLower)
      );
    });

    const total = filteredEntries.length;
    const paginatedEntries = filteredEntries.slice(skip, skip + limit);

    // Re-populate the entries
    const populatedEntries = await TimeEntry.find({
      _id: { $in: paginatedEntries.map((e) => e._id) },
    })
      .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
      .populate('clientId', 'name')
      .populate('packageId', 'name type')
      .populate('taskId', 'name category')
      .sort({ date: -1, createdAt: -1 });

    return {
      timeEntries: populatedEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  const [timeEntries, total] = await Promise.all([
    timeEntriesQuery.skip(skip).limit(limit),
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

  // Check if there's already a running/paused timer for this employee
  const existingTimer = await TimeEntry.findOne({
    employeeId: timerData.employeeId,
    $or: [{ isRunning: true }, { isPaused: true }],
  });

  if (existingTimer) {
    throw new Error('There is already a running or paused timer for this employee. Please stop or resume it first.');
  }

  // If miscellaneous, use the miscellaneous function
  if (timerData.isMiscellaneous) {
    return await startMiscellaneousTimer(timerData, userId, userRole);
  }

  // Verify task exists and belongs to package
  if (timerData.taskId) {
    const task = await Task.findById(timerData.taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check if task is assigned to the employee (for EMPLOYEE and MANAGER roles)
    if (userRole === 'EMPLOYEE' || userRole === 'MANAGER') {
      const assignedEmployeeIds = task.assignedTo?.map(id => id.toString()) || [];
      if (assignedEmployeeIds.length > 0 && !assignedEmployeeIds.includes(timerData.employeeId.toString())) {
        throw new Error('This task is not assigned to you');
      }
    }

    if (timerData.packageId && task.packageId.toString() !== timerData.packageId) {
      throw new Error('Task does not belong to the specified package');
    }

    // Verify package belongs to client
    if (timerData.packageId) {
      const packageDoc = await Package.findById(timerData.packageId);
      if (!packageDoc) {
        throw new Error('Package not found');
      }

      if (timerData.clientId && packageDoc.clientId.toString() !== timerData.clientId) {
        throw new Error('Package does not belong to the specified client');
      }
    }
  }

  const now = new Date();
  const timerEntry = await TimeEntry.create({
    ...timerData,
    date: timerData.date || now,
    startTime: now,
    timerStartedAt: now,
    isRunning: true,
    isPaused: false,
    minutesSpent: 0,
    accumulatedSeconds: 0,
    isMiscellaneous: timerData.isMiscellaneous || false,
  });

  return await TimeEntry.findById(timerEntry._id)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');
};

export const stopTimer = async (timerId, userId, userRole, markTaskComplete = false) => {
  const timerEntry = await TimeEntry.findById(timerId);
  if (!timerEntry) {
    throw new Error('Timer not found');
  }

  if (!timerEntry.isRunning && !timerEntry.isPaused) {
    throw new Error('Timer is not running or paused');
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
  let totalSeconds = timerEntry.accumulatedSeconds || 0;

  // If running, add elapsed time since last start/resume
  if (timerEntry.isRunning) {
    const startTime = timerEntry.timerStartedAt || timerEntry.startTime || timerEntry.createdAt;
    const elapsedSeconds = Math.floor((now - new Date(startTime)) / 1000);
    totalSeconds += elapsedSeconds;
  }

  timerEntry.endTime = now;
  timerEntry.isRunning = false;
  timerEntry.isPaused = false;
  // Store seconds in minutesSpent (field name kept for backward compatibility, but value is in seconds)
  timerEntry.minutesSpent = totalSeconds;
  timerEntry.accumulatedSeconds = 0;
  await timerEntry.save();

  // If miscellaneous, create a task
  if (timerEntry.isMiscellaneous && !timerEntry.taskId) {
    const Task = (await import('../task/task.model.js')).default;
    const newTask = await Task.create({
      clientId: timerEntry.clientId || null,
      packageId: timerEntry.packageId || null,
      name: timerEntry.miscellaneousDescription || 'Miscellaneous Task',
      description: timerEntry.description || timerEntry.miscellaneousDescription,
      status: 'DONE',
      createdFromTimeEntry: timerEntry._id,
    });

    timerEntry.taskId = newTask._id;
    await timerEntry.save();
  }

  // If markTaskComplete is true and task exists, mark task as DONE
  if (markTaskComplete && timerEntry.taskId) {
    const task = await Task.findById(timerEntry.taskId);
    if (task) {
      task.status = 'DONE';
      await task.save();
    }
  }

  return await TimeEntry.findById(timerEntry._id)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');
};

export const getRunningTimer = async (employeeId) => {
  const timer = await TimeEntry.findOne({
    employeeId,
    $or: [{ isRunning: true }, { isPaused: true }],
  })
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');

  return timer;
};

export const pauseTimer = async (timerId, userId, userRole) => {
  const timerEntry = await TimeEntry.findById(timerId);
  if (!timerEntry) {
    throw new Error('Timer not found');
  }

  if (!timerEntry.isRunning) {
    throw new Error('Timer is not running');
  }

  // If user is EMPLOYEE, ensure they can only pause their own timer
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (timerEntry.employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('Employees can only pause their own timers');
    }
  }

  const now = new Date();
  const startTime = timerEntry.timerStartedAt || timerEntry.startTime || timerEntry.createdAt;
  const elapsedSeconds = Math.floor((now - new Date(startTime)) / 1000);
  const totalAccumulated = (timerEntry.accumulatedSeconds || 0) + elapsedSeconds;

  timerEntry.isRunning = false;
  timerEntry.isPaused = true;
  timerEntry.pausedAt = now;
  timerEntry.accumulatedSeconds = totalAccumulated;
  await timerEntry.save();

  return timerEntry;
};

export const resumeTimer = async (timerId, userId, userRole) => {
  const timerEntry = await TimeEntry.findById(timerId);
  if (!timerEntry) {
    throw new Error('Timer not found');
  }

  if (!timerEntry.isPaused) {
    throw new Error('Timer is not paused');
  }

  // If user is EMPLOYEE, ensure they can only resume their own timer
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (timerEntry.employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('Employees can only resume their own timers');
    }
  }

  const now = new Date();
  timerEntry.isRunning = true;
  timerEntry.isPaused = false;
  timerEntry.timerStartedAt = now;
  timerEntry.pausedAt = null;
  await timerEntry.save();

  return timerEntry;
};

export const startTimerForTask = async (taskId, employeeId, userId, userRole) => {
  const User = (await import('../auth/auth.model.js')).default;
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // If user is EMPLOYEE or MANAGER, use their linked employeeId
  if (userRole === 'EMPLOYEE' || userRole === 'MANAGER') {
    if (!user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    // If employeeId is provided, verify it matches the user's employeeId
    if (employeeId && employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('You can only start timer for yourself');
    }
    employeeId = user.employeeId; // Use the linked employeeId
  } else if (userRole === 'ADMIN') {
    // ADMIN can start timer for any employee if employeeId is provided
    // Or use their own employeeId if they have one linked
    if (!employeeId && user.employeeId) {
      employeeId = user.employeeId; // Use admin's linked employeeId if available
    }

    if (!employeeId) {
      throw new Error('Employee ID is required for ADMIN users without linked employee record');
    }
  } else {
    // For other roles, employeeId must be provided
    if (!employeeId) {
      throw new Error('Employee ID is required');
    }
  }

  // Ensure employeeId is set
  if (!employeeId) {
    throw new Error('Employee ID is required');
  }

  // Check if there's already a running/paused timer for this employee
  const existingTimer = await TimeEntry.findOne({
    employeeId,
    $or: [{ isRunning: true }, { isPaused: true }],
  });

  if (existingTimer) {
    throw new Error('There is already a running or paused timer for this employee. Please stop or resume it first.');
  }

  // Get task and populate client/package
  const task = await Task.findById(taskId)
    .populate('clientId', 'name')
    .populate('packageId', 'name type');

  if (!task) {
    throw new Error('Task not found');
  }

  // Check if task is assigned to the employee (for EMPLOYEE and MANAGER roles)
  if (userRole === 'EMPLOYEE' || userRole === 'MANAGER') {
    const assignedEmployeeIds = task.assignedTo?.map(id => id.toString()) || [];
    if (assignedEmployeeIds.length > 0 && !assignedEmployeeIds.includes(employeeId.toString())) {
      throw new Error('This task is not assigned to you');
    }
  }

  // Update task status to IN_PROGRESS if it's TODO
  if (task.status === 'TODO') {
    task.status = 'IN_PROGRESS';
    await task.save();
  }

  const now = new Date();
  const timerEntry = await TimeEntry.create({
    employeeId,
    clientId: task.clientId._id,
    packageId: task.packageId._id,
    taskId: task._id,
    date: now,
    startTime: now,
    timerStartedAt: now,
    isRunning: true,
    isPaused: false,
    minutesSpent: 0,
    accumulatedSeconds: 0,
    isMiscellaneous: false,
  });

  return await TimeEntry.findById(timerEntry._id)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');
};

export const startMiscellaneousTimer = async (timerData, userId, userRole) => {
  // If user is EMPLOYEE, ensure they can only start timer for themselves
  if (userRole === 'EMPLOYEE') {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || !user.employeeId) {
      throw new Error('Employee record not found for user');
    }

    if (timerData.employeeId && timerData.employeeId.toString() !== user.employeeId.toString()) {
      throw new Error('Employees can only start timer for themselves');
    }
    timerData.employeeId = user.employeeId; // Keep as ObjectId, not string
  } else {
    // For non-employees, employeeId must be provided
    if (!timerData.employeeId) {
      throw new Error('Employee ID is required');
    }
    // Convert string to ObjectId if needed
    if (typeof timerData.employeeId === 'string') {
      timerData.employeeId = mongoose.Types.ObjectId(timerData.employeeId);
    }
  }

  // Check if there's already a running/paused timer for this employee
  const existingTimer = await TimeEntry.findOne({
    employeeId: timerData.employeeId,
    $or: [{ isRunning: true }, { isPaused: true }],
  });

  if (existingTimer) {
    throw new Error('There is already a running or paused timer for this employee. Please stop or resume it first.');
  }

  const now = new Date();
  const timerEntry = await TimeEntry.create({
    ...timerData,
    date: timerData.date || now,
    startTime: now,
    timerStartedAt: now,
    isRunning: true,
    isPaused: false,
    minutesSpent: 0,
    accumulatedSeconds: 0,
    isMiscellaneous: true,
  });

  return await TimeEntry.findById(timerEntry._id)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours')
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('taskId', 'name category');
};

