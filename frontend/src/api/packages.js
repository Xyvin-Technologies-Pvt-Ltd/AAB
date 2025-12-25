import api from './axios';

export const packagesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/packages', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/packages/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/packages', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/packages/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/packages/${id}`);
    return response.data;
  },
};

