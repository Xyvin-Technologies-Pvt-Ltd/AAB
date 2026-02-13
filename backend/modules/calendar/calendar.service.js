import crypto from 'crypto';
import ical from 'ical-generator';
import User from '../auth/auth.model.js';
import * as clientService from '../client/client.service.js';
import * as taskService from '../task/task.service.js';

const getBaseUrl = () => {
  const base = process.env.API_BASE_URL || process.env.BACKEND_URL;
  if (base) return base.replace(/\/$/, '');
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

/**
 * Generate a calendar feed token for the user and return the subscription URL.
 */
export const generateToken = async (user) => {
  const token = crypto.randomUUID();
  await User.findByIdAndUpdate(user._id, {
    calendarToken: token,
  });
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/calendar/feed/${token}.ics`;
};

/**
 * Revoke the user's calendar feed token.
 */
export const revokeToken = async (user) => {
  await User.findByIdAndUpdate(user._id, { $unset: { calendarToken: 1 } });
};

/**
 * Get iCal feed for a token. Returns ICS string or null if token invalid.
 */
export const getFeedIcs = async (token) => {
  const user = await User.findOne({ calendarToken: token }).select('employeeId');
  if (!user) return null;

  // Every user (including admin) only sees tasks assigned to themselves
  const myEmployeeId = user.employeeId ? user.employeeId.toString() : null;

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 2);
  endDate.setHours(23, 59, 59, 999);

  const [events, allTasks] = await Promise.all([
    clientService.getCalendarEvents(startDate, endDate, null),
    taskService.getCalendarTasks(startDate, endDate, null),
  ]);

  const tasks = myEmployeeId
    ? allTasks.filter((task) => {
        const assignedTo = task.assignedTo || [];
        const assignedIds = assignedTo.map((id) => (id && id._id ? id._id.toString() : id.toString()));
        return assignedIds.includes(myEmployeeId);
      })
    : [];

  const cal = ical({ name: 'AAcounting Calendar' });
  cal.prodId({ company: 'AAcounting', product: 'Calendar Feed', language: 'EN' });

  for (const ev of events) {
    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : new Date(ev.start);
    end.setDate(end.getDate() + 1);
    cal.createEvent({
      id: ev.id,
      start,
      end,
      allDay: true,
      summary: ev.title,
      description: [ev.type, ev.clientName, ev.metadata ? JSON.stringify(ev.metadata) : ''].filter(Boolean).join('\n'),
    });
  }

  for (const task of tasks) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
    const start = new Date(dueDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const clientName = task.clientId?.name || '';
    const summary = task.name || 'Task';
    const description = [
      task.description || '',
      `Status: ${task.status || 'TODO'}`,
      `Priority: ${task.priority || 'MEDIUM'}`,
      clientName ? `Client: ${clientName}` : '',
    ].filter(Boolean).join('\n');
    cal.createEvent({
      id: task._id?.toString?.() || task.id || `task-${start.getTime()}`,
      start,
      end,
      allDay: true,
      summary,
      description,
    });
  }

  return cal.toString();
};
