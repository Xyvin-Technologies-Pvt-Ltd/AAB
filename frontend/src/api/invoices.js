import api from './axios';

export const invoicesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/invoices/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },

  getUnbilledTimeEntries: async (clientId) => {
    const response = await api.get('/invoices/unbilled-time-entries', {
      params: { clientId },
    });
    return response.data;
  },
};
