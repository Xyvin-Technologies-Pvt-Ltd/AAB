import api from './axios';

export const analyticsApi = {
  getPackageProfitability: async (params = {}) => {
    const response = await api.get('/analytics/packages', { params });
    return response.data;
  },

  getClientProfitability: async (params = {}) => {
    const response = await api.get('/analytics/clients', { params });
    return response.data;
  },

  getEmployeeUtilization: async (params = {}) => {
    const response = await api.get('/analytics/employees', { params });
    return response.data;
  },

  getClientDashboard: async (clientId, params = {}) => {
    const response = await api.get(`/analytics/client/${clientId}/dashboard`, { params });
    return response.data;
  },
};

