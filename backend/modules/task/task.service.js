import Task from './task.model.js';
import Package from '../package/package.model.js';

const populateTask = (query) =>
  query
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('services', 'name')
    .populate('activities', 'name')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email')
    .populate('activityLog.performedBy', 'email');

export const createTask = async (taskData, userId) => {
  // Verify package exists and belongs to the specified client
  const packageDoc = await Package.findById(taskData.packageId);
  if (!packageDoc) {
    throw new Error('Package not found');
  }

  if (packageDoc.clientId.toString() !== taskData.clientId) {
    throw new Error('Package does not belong to the specified client');
  }

  // Set reporter if not provided
  if (!taskData.reporter && userId) {
    taskData.reporter = userId;
  }

  const activityEntry = {
    action: 'CREATED',
    performedBy: userId,
    timestamp: new Date(),
  };

  const task = await Task.create({ ...taskData, activityLog: [activityEntry] });
  return task;
};

export const getTasks = async (filters = {}) => {
  const { clientId, packageId, status, assignedTo, priority, search, dateFrom, dateTo, page = 1, limit = 10 } = filters;

  const query = {};

  if (clientId) query.clientId = clientId;
  if (packageId) query.packageId = packageId;

  if (status) {
    // Support comma-separated statuses e.g. "TODO,IN_PROGRESS"
    if (status.includes(',')) {
      query.status = { $in: status.split(',') };
    } else {
      query.status = status;
    }
  } else {
    // By default exclude ARCHIVED tasks from the board
    query.status = { $ne: 'ARCHIVED' };
  }

  if (assignedTo) query.assignedTo = assignedTo;
  if (priority) {
    if (priority.includes(',')) {
      query.priority = { $in: priority.split(',') };
    } else {
      query.priority = priority;
    }
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  if (dateFrom || dateTo) {
    query.dueDate = {};
    if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.dueDate.$lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('clientId', 'name')
      .populate('packageId', 'name type')
      .populate('assignedTo', 'name email')
      .populate('services', 'name')
      .populate('activities', 'name')
      .populate('reporter', 'email')
      .populate('comments.author', 'email')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(query),
  ]);

  return {
    tasks,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getTaskById = async (taskId) => {
  const task = await populateTask(Task.findById(taskId)).exec();
  if (!task) throw new Error('Task not found');
  return task;
};

export const updateTask = async (taskId, updateData, userId) => {
  const currentTask = await Task.findById(taskId);
  if (!currentTask) throw new Error('Task not found');

  if (updateData.packageId || updateData.clientId) {
    const packageId = updateData.packageId || currentTask.packageId;
    const clientId = updateData.clientId || currentTask.clientId;
    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) throw new Error('Package not found');
    if (packageDoc.clientId.toString() !== clientId.toString()) {
      throw new Error('Package does not belong to the specified client');
    }
  }

  // Build activity log entries
  const activityEntries = [];
  if (userId) {
    if (updateData.status && updateData.status !== currentTask.status) {
      activityEntries.push({
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: currentTask.status,
        newValue: updateData.status,
        performedBy: userId,
        timestamp: new Date(),
      });
      // Track when task moved to DONE
      if (updateData.status === 'DONE') {
        updateData.doneAt = new Date();
      }
    }
    if (updateData.priority && updateData.priority !== currentTask.priority) {
      activityEntries.push({
        action: 'PRIORITY_CHANGED',
        field: 'priority',
        oldValue: currentTask.priority,
        newValue: updateData.priority,
        performedBy: userId,
        timestamp: new Date(),
      });
    }
    if (updateData.name && updateData.name !== currentTask.name) {
      activityEntries.push({
        action: 'EDITED',
        field: 'name',
        oldValue: currentTask.name,
        newValue: updateData.name,
        performedBy: userId,
        timestamp: new Date(),
      });
    }
  }

  const finalUpdate = activityEntries.length > 0
    ? { ...updateData, $push: { activityLog: { $each: activityEntries } } }
    : updateData;

  const task = await Task.findByIdAndUpdate(taskId, finalUpdate, {
    new: true,
    runValidators: true,
  });

  if (!task) throw new Error('Task not found');
  return populateTask(Task.findById(task._id)).exec();
};

export const deleteTask = async (taskId) => {
  const task = await Task.findByIdAndDelete(taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  return task;
};

export const updateTaskOrder = async (taskId, order) => {
  const task = await Task.findByIdAndUpdate(
    taskId,
    { order },
    { new: true, runValidators: true }
  );
  if (!task) throw new Error('Task not found');
  return populateTask(Task.findById(task._id)).exec();
};

export const archiveTask = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const activityEntry = {
    action: 'ARCHIVED',
    performedBy: userId,
    timestamp: new Date(),
  };

  const updated = await Task.findByIdAndUpdate(
    taskId,
    {
      status: 'ARCHIVED',
      archivedAt: new Date(),
      $push: { activityLog: activityEntry },
    },
    { new: true, runValidators: true }
  );
  if (!updated) throw new Error('Task not found');
  return populateTask(Task.findById(updated._id)).exec();
};

export const unarchiveTask = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const activityEntry = {
    action: 'UNARCHIVED',
    performedBy: userId,
    timestamp: new Date(),
  };

  const updated = await Task.findByIdAndUpdate(
    taskId,
    {
      status: 'DONE',
      archivedAt: null,
      $push: { activityLog: activityEntry },
    },
    { new: true, runValidators: true }
  );
  if (!updated) throw new Error('Task not found');
  return populateTask(Task.findById(updated._id)).exec();
};

export const getWorkload = async (filters = {}) => {
  const { clientId, packageId } = filters;
  const query = { status: { $ne: 'ARCHIVED' } };
  if (clientId) query.clientId = clientId;
  if (packageId) query.packageId = packageId;

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email')
    .populate('clientId', 'name')
    .lean();

  const workloadMap = {};
  for (const task of tasks) {
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [{ _id: 'unassigned', name: 'Unassigned', email: '' }];
    for (const emp of assignees) {
      const key = emp._id?.toString() || 'unassigned';
      if (!workloadMap[key]) {
        workloadMap[key] = {
          employee: emp,
          tasks: [],
          counts: { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 },
          overdueCount: 0,
        };
      }
      workloadMap[key].tasks.push(task);
      workloadMap[key].counts[task.status] = (workloadMap[key].counts[task.status] || 0) + 1;
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE') {
        workloadMap[key].overdueCount += 1;
      }
    }
  }

  return Object.values(workloadMap).sort((a, b) => b.tasks.length - a.tasks.length);
};

export const getCalendarTasks = async (startDate, endDate, clientId = null) => {
  const query = {
    dueDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  if (clientId) {
    query.clientId = clientId;
  }

  const tasks = await Task.find(query)
    .populate('clientId', 'name')
    .populate('packageId', 'name')
    .populate('assignedTo', 'name email')
    .sort({ dueDate: 1, order: 1 });

  // Generate recurring task instances
  const recurringTasks = await Task.find({
    isRecurring: true,
    'recurringPattern.endDate': { $gte: new Date(startDate) },
    $or: [
      { 'recurringPattern.endDate': { $exists: false } },
      { 'recurringPattern.endDate': null },
    ],
  })
    .populate('clientId', 'name')
    .populate('packageId', 'name')
    .populate('assignedTo', 'name email');

  const allEvents = [...tasks];

  // Generate instances for recurring tasks
  for (const task of recurringTasks) {
    if (clientId && task.clientId._id.toString() !== clientId) {
      continue;
    }

    const instances = generateRecurringInstances(task, startDate, endDate);
    allEvents.push(...instances);
  }

  return allEvents;
};

export const addComment = async (taskId, commentData, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const comment = { author: userId, content: commentData.content, createdAt: new Date() };
  const activityEntry = { action: 'COMMENT_ADDED', performedBy: userId, timestamp: new Date() };

  task.comments.push(comment);
  task.activityLog.push(activityEntry);
  await task.save();

  return populateTask(Task.findById(taskId)).exec();
};

export const deleteComment = async (taskId, commentId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const comment = task.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');

  if (comment.author.toString() !== userId.toString()) {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || user.role !== 'ADMIN') throw new Error('You can only delete your own comments');
  }

  task.comments.pull(commentId);
  task.activityLog.push({ action: 'COMMENT_DELETED', performedBy: userId, timestamp: new Date() });
  await task.save();

  return populateTask(Task.findById(taskId)).exec();
};

export const addAttachment = async (taskId, fileData, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const attachment = { name: fileData.name, url: fileData.url, key: fileData.key, uploadedBy: userId, uploadedAt: new Date() };
  task.attachments.push(attachment);
  task.activityLog.push({ action: 'ATTACHMENT_ADDED', newValue: fileData.name, performedBy: userId, timestamp: new Date() });
  await task.save();

  return populateTask(Task.findById(taskId)).exec();
};

export const deleteAttachment = async (taskId, attachmentId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  const attachment = task.attachments.id(attachmentId);
  if (!attachment) throw new Error('Attachment not found');

  if (attachment.uploadedBy.toString() !== userId.toString()) {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || user.role !== 'ADMIN') throw new Error('You can only delete your own attachments');
  }

  const { deleteFile } = await import('../../helpers/s3Storage.js');
  await deleteFile(attachment.key);

  task.attachments.pull(attachmentId);
  task.activityLog.push({ action: 'ATTACHMENT_DELETED', oldValue: attachment.name, performedBy: userId, timestamp: new Date() });
  await task.save();

  return populateTask(Task.findById(taskId)).exec();
};

const generateRecurringInstances = (task, startDate, endDate) => {
  const instances = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const pattern = task.recurringPattern;

  if (!pattern || !pattern.frequency) {
    return instances;
  }

  let currentDate = new Date(task.dueDate || task.createdAt);
  if (currentDate < start) {
    // Find the first occurrence after start date
    currentDate = findNextOccurrence(task, start);
  }

  while (currentDate <= end) {
    if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
      break;
    }

    // Create instance
    const instance = {
      ...task.toObject(),
      _id: `${task._id}_${currentDate.toISOString()}`,
      dueDate: new Date(currentDate),
      isRecurringInstance: true,
      recurringParentId: task._id,
    };
    instances.push(instance);

    // Calculate next occurrence
    currentDate = getNextOccurrenceDate(currentDate, pattern);
  }

  return instances;
};

const findNextOccurrence = (task, startDate) => {
  const pattern = task.recurringPattern;
  const baseDate = new Date(task.dueDate || task.createdAt);
  let current = new Date(baseDate);

  while (current < startDate) {
    current = getNextOccurrenceDate(current, pattern);
    if (pattern.endDate && current > new Date(pattern.endDate)) {
      return null;
    }
  }

  return current;
};

const getNextOccurrenceDate = (currentDate, pattern) => {
  const next = new Date(currentDate);
  const interval = pattern.interval || 1;

  switch (pattern.frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;
    case 'WEEKLY':
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        // Find next day of week
        let found = false;
        let daysToAdd = 0;
        while (!found && daysToAdd < 7 * interval) {
          next.setDate(next.getDate() + 1);
          daysToAdd++;
          const dayOfWeek = next.getDay();
          if (pattern.daysOfWeek.includes(dayOfWeek)) {
            found = true;
          }
        }
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
      break;
    case 'MONTHLY':
      if (pattern.dayOfMonth) {
        next.setMonth(next.getMonth() + interval);
        next.setDate(pattern.dayOfMonth);
      } else {
        next.setMonth(next.getMonth() + interval);
      }
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next.setDate(next.getDate() + interval);
  }

  return next;
};

