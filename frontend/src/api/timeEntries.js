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

  stopTimer: async (id) => {
    const response = await api.post(`/time-entries/stop/${id}`);
    return response.data;
  },

  getRunningTimer: async (employeeId) => {
    const response = await api.get('/time-entries/running', {
      params: { employeeId },
    });
    return response.data;
  },
};

