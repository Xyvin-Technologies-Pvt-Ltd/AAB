import api from './axios';

export const analyticsApi = {
  getPackageProfitability: async (params = {}) => {
    // Remove undefined/null values from params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get('/analytics/packages', { params: cleanParams });
    return response.data;
  },

  getClientProfitability: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get('/analytics/clients', { params: cleanParams });
    return response.data;
  },

  getEmployeeUtilization: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get('/analytics/employees', { params: cleanParams });
    return response.data;
  },

  getClientDashboard: async (clientId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/client/${clientId}/dashboard`, { params: cleanParams });
    return response.data;
  },

  getDashboardStatistics: async () => {
    const response = await api.get('/analytics/dashboard-statistics');
    return response.data;
  },

  getPackageAnalytics: async (packageId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/package/${packageId}`, { params: cleanParams });
    return response.data;
  },

  getClientAnalytics: async (clientId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/client/${clientId}`, { params: cleanParams });
    return response.data;
  },

  getEmployeeAnalytics: async (employeeId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/employee/${employeeId}`, { params: cleanParams });
    return response.data;
  },
};

