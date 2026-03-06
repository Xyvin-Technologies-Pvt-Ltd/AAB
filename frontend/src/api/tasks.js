import api from './axios';

export const tasksApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  updateOrder: async (id, order) => {
    const response = await api.patch(`/tasks/${id}/order`, { order });
    return response.data;
  },

  getCalendarTasks: async (params = {}) => {
    const response = await api.get('/tasks/calendar', { params });
    return response.data;
  },

  addComment: async (taskId, content) => {
    const response = await api.post(`/tasks/${taskId}/comments`, { content });
    return response.data;
  },

  deleteComment: async (taskId, commentId) => {
    const response = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  },

  addAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteAttachment: async (taskId, attachmentId) => {
    const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
  },

  archive: async (taskId) => {
    const response = await api.patch(`/tasks/${taskId}/archive`);
    return response.data;
  },

  unarchive: async (taskId) => {
    const response = await api.patch(`/tasks/${taskId}/unarchive`);
    return response.data;
  },

  getArchived: async (params = {}) => {
    const response = await api.get('/tasks', { params: { ...params, status: 'ARCHIVED', limit: 1000 } });
    return response.data;
  },

  getWorkload: async (params = {}) => {
    const response = await api.get('/tasks/workload', { params });
    return response.data;
  },
};

export const adminApi = {
  triggerArchive: async () => {
    const response = await api.post('/admin/scheduler/archive');
    return response.data;
  },

  triggerDueSoon: async () => {
    const response = await api.post('/admin/scheduler/due-soon');
    return response.data;
  },
};

