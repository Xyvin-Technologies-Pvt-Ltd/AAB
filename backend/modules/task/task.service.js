import Task from './task.model.js';
import Package from '../package/package.model.js';

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

  const task = await Task.create(taskData);
  return task;
};

export const getTasks = async (filters = {}) => {
  const { clientId, packageId, status, assignedTo, priority, search, page = 1, limit = 10 } = filters;

  const query = {};

  if (clientId) {
    query.clientId = clientId;
  }

  if (packageId) {
    query.packageId = packageId;
  }

  if (status) {
    query.status = status;
  }

  if (assignedTo) {
    // Support filtering by single employee ID (finds tasks where this employee is assigned)
    query.assignedTo = assignedTo;
  }

  if (priority) {
    query.priority = priority;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('clientId', 'name')
      .populate('packageId', 'name type')
      .populate('assignedTo', 'name email')
      .populate('reporter', 'email')
      .populate('comments.author', 'email')
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Task.countDocuments(query),
  ]);

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getTaskById = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');
  if (!task) {
    throw new Error('Task not found');
  }
  return task;
};

export const updateTask = async (taskId, updateData) => {
  // If packageId or clientId is being updated, verify relationships
  if (updateData.packageId || updateData.clientId) {
    const currentTask = await Task.findById(taskId);
    if (!currentTask) {
      throw new Error('Task not found');
    }

    const packageId = updateData.packageId || currentTask.packageId;
    const clientId = updateData.clientId || currentTask.clientId;

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
      throw new Error('Package not found');
    }

    if (packageDoc.clientId.toString() !== clientId.toString()) {
      throw new Error('Package does not belong to the specified client');
    }
  }

  const task = await Task.findByIdAndUpdate(taskId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');

  if (!task) {
    throw new Error('Task not found');
  }

  return task;
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
  )
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');

  if (!task) {
    throw new Error('Task not found');
  }
  return task;
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
  if (!task) {
    throw new Error('Task not found');
  }

  const comment = {
    author: userId,
    content: commentData.content,
    createdAt: new Date(),
  };

  task.comments.push(comment);
  await task.save();

  return await Task.findById(taskId)
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');
};

export const deleteComment = async (taskId, commentId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const comment = task.comments.id(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }

  // Only allow author or admin to delete
  if (comment.author.toString() !== userId.toString()) {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || user.role !== 'ADMIN') {
      throw new Error('You can only delete your own comments');
    }
  }

  task.comments.pull(commentId);
  await task.save();

  return await Task.findById(taskId)
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');
};

export const addAttachment = async (taskId, fileData, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const attachment = {
    name: fileData.name,
    url: fileData.url,
    key: fileData.key,
    uploadedBy: userId,
    uploadedAt: new Date(),
  };

  task.attachments.push(attachment);
  await task.save();

  return await Task.findById(taskId)
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');
};

export const deleteAttachment = async (taskId, attachmentId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  const attachment = task.attachments.id(attachmentId);
  if (!attachment) {
    throw new Error('Attachment not found');
  }

  // Only allow uploader or admin to delete
  if (attachment.uploadedBy.toString() !== userId.toString()) {
    const User = (await import('../auth/auth.model.js')).default;
    const user = await User.findById(userId);
    if (!user || user.role !== 'ADMIN') {
      throw new Error('You can only delete your own attachments');
    }
  }

  // Delete from S3
  const { deleteFile } = await import('../../helpers/s3Storage.js');
  await deleteFile(attachment.key);

  task.attachments.pull(attachmentId);
  await task.save();

  return await Task.findById(taskId)
    .populate('clientId', 'name')
    .populate('packageId', 'name type')
    .populate('assignedTo', 'name email')
    .populate('reporter', 'email')
    .populate('comments.author', 'email')
    .populate('attachments.uploadedBy', 'email');
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

