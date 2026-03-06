import cron from 'node-cron';
import Task from './modules/task/task.model.js';
import * as notificationService from './modules/notification/notification.service.js';
import logger from './helpers/logger.js';

const AUTO_ARCHIVE_DAYS = parseInt(process.env.AUTO_ARCHIVE_DAYS || '7', 10);
const DUE_SOON_HOURS = parseInt(process.env.DUE_SOON_HOURS || '24', 10);

/**
 * Auto-archive tasks that have been in DONE status for AUTO_ARCHIVE_DAYS+ days.
 * Runs daily at 02:00 AM.
 */
const runAutoArchive = async () => {
  try {
    const cutoff = new Date(Date.now() - AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

    // Match tasks where doneAt is set and old enough, OR doneAt is missing
    // but updatedAt (last status change proxy) is old enough — covers pre-feature tasks
    const result = await Task.updateMany(
      {
        status: 'DONE',
        $or: [
          { doneAt: { $lte: cutoff } },
          { doneAt: null, updatedAt: { $lte: cutoff } },
          { doneAt: { $exists: false }, updatedAt: { $lte: cutoff } },
        ],
      },
      {
        $set: { status: 'ARCHIVED', archivedAt: new Date() },
        $push: {
          activityLog: {
            action: 'ARCHIVED',
            newValue: 'auto-archived',
            timestamp: new Date(),
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[scheduler] Auto-archived ${result.modifiedCount} task(s) older than ${AUTO_ARCHIVE_DAYS} days`);
    }
  } catch (error) {
    logger.error(`[scheduler] Auto-archive failed: ${error.message}`);
  }
};

/**
 * Notify users about tasks due within the next DUE_SOON_HOURS hours.
 * Runs daily at 08:00 AM.
 */
const runDueSoonNotifications = async () => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + DUE_SOON_HOURS * 60 * 60 * 1000);

    const tasks = await Task.find({
      status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW'] },
      dueDate: { $gte: now, $lte: soon },
    })
      .populate('assignedTo', 'name email')
      .populate('clientId', 'name')
      .populate('reporter', '_id email')
      .lean();

    let notified = 0;
    for (const task of tasks) {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
      const userIds = assignees.map((e) => e._id?.toString()).filter(Boolean);

      if (userIds.length === 0) continue;

      // Use the reporter's auth user if we need to link to User model
      // For now we notify using employee IDs — in practice you'd resolve to User._id
      // This is a best-effort notification; skips if no userIds found
      await notificationService.createNotificationsForUsers(userIds, {
        type: 'DUE_DATE_APPROACHING',
        title: 'Task due soon',
        message: `"${task.name}" is due within ${DUE_SOON_HOURS} hours`,
        data: {
          taskId: task._id,
          taskName: task.name,
          clientName: task.clientId?.name || '',
        },
      });
      notified++;
    }

    if (notified > 0) {
      logger.info(`[scheduler] Sent due-soon notifications for ${notified} task(s)`);
    }
  } catch (error) {
    logger.error(`[scheduler] Due-soon notifications failed: ${error.message}`);
  }
};

/**
 * Notify users about overdue tasks.
 * Runs daily at 09:00 AM.
 */
const runOverdueNotifications = async () => {
  try {
    const now = new Date();

    const tasks = await Task.find({
      status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW'] },
      dueDate: { $lt: now },
    })
      .populate('assignedTo', 'name email')
      .populate('clientId', 'name')
      .lean();

    let notified = 0;
    for (const task of tasks) {
      const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
      const userIds = assignees.map((e) => e._id?.toString()).filter(Boolean);

      if (userIds.length === 0) continue;

      await notificationService.createNotificationsForUsers(userIds, {
        type: 'TASK_OVERDUE',
        title: 'Task overdue',
        message: `"${task.name}" is overdue`,
        data: {
          taskId: task._id,
          taskName: task.name,
          clientName: task.clientId?.name || '',
        },
      });
      notified++;
    }

    if (notified > 0) {
      logger.info(`[scheduler] Sent overdue notifications for ${notified} task(s)`);
    }
  } catch (error) {
    logger.error(`[scheduler] Overdue notifications failed: ${error.message}`);
  }
};

export const startScheduler = () => {
  // Auto-archive DONE tasks every day at 2:00 AM
  cron.schedule('0 2 * * *', runAutoArchive, { timezone: 'UTC' });

  // Due-soon notifications every day at 8:00 AM
  cron.schedule('0 8 * * *', runDueSoonNotifications, { timezone: 'UTC' });

  // Overdue notifications every day at 9:00 AM
  cron.schedule('0 9 * * *', runOverdueNotifications, { timezone: 'UTC' });

  logger.info('[scheduler] Cron jobs started: auto-archive (02:00), due-soon (08:00), overdue (09:00)');
};

// Expose individual runners for manual triggering via API (admin only)
export { runAutoArchive, runDueSoonNotifications, runOverdueNotifications };
