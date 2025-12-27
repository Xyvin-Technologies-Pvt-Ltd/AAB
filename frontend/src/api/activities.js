import api from './axios';

export const activitiesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/activities', { params });
    return response.data;
  },

  getById: async (id, params = {}) => {
    const response = await api.get(`/activities/${id}`, { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/activities', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/activities/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/activities/${id}`);
    return response.data;
  },
};

