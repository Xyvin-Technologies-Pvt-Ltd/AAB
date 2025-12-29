import api from './axios';

export const timeEntriesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/time-entries', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/time-entries/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/time-entries', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/time-entries/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/time-entries/${id}`);
    return response.data;
  },

  startTimer: async (data) => {
    const response = await api.post('/time-entries/start', data);
    return response.data;
  },

  getRunningTimer: async (employeeId) => {
    const response = await api.get('/time-entries/running', {
      params: { employeeId },
    });
    return response.data;
  },

  pauseTimer: async (id) => {
    const response = await api.post(`/time-entries/pause/${id}`);
    return response.data;
  },

  resumeTimer: async (id) => {
    const response = await api.post(`/time-entries/resume/${id}`);
    return response.data;
  },

  startTimerForTask: async (taskId, employeeId) => {
    const response = await api.post(`/time-entries/start-for-task/${taskId}`, {
      employeeId,
    });
    return response.data;
  },

  startMiscellaneousTimer: async (data) => {
    const response = await api.post('/time-entries/start', {
      ...data,
      isMiscellaneous: true,
    });
    return response.data;
  },

  stopTimer: async (id, markTaskComplete = false) => {
    const response = await api.post(`/time-entries/stop/${id}?markTaskComplete=${markTaskComplete}`);
    return response.data;
  },
};

