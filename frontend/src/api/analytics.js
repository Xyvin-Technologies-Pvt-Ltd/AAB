import api from './axios';

export const analyticsApi = {
  // params may include viewMode: 'my' | 'all' (for admin toggle)
  getPackageProfitability: async (params = {}) => {
    // Always include page and limit, filter out only undefined/null/empty string for other params
    const cleanParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      ...Object.fromEntries(
        Object.entries(params).filter(([k, v]) => 
          k !== 'page' && k !== 'limit' && v !== undefined && v !== null && v !== ''
        )
      ),
    };
    const response = await api.get('/analytics/packages', { params: cleanParams });
    return response.data;
  },

  // params may include viewMode: 'my' | 'all' (for admin toggle)
  getClientProfitability: async (params = {}) => {
    // Always include page and limit, filter out only undefined/null/empty string for other params
    const cleanParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      ...Object.fromEntries(
        Object.entries(params).filter(([k, v]) => 
          k !== 'page' && k !== 'limit' && v !== undefined && v !== null && v !== ''
        )
      ),
    };
    const response = await api.get('/analytics/clients', { params: cleanParams });
    return response.data;
  },

  // params may include viewMode: 'my' | 'all' (for admin toggle)
  getEmployeeUtilization: async (params = {}) => {
    // Always include page and limit, filter out only undefined/null/empty string for other params
    const cleanParams = {
      page: params.page || 1,
      limit: params.limit || 10,
      ...Object.fromEntries(
        Object.entries(params).filter(([k, v]) => 
          k !== 'page' && k !== 'limit' && v !== undefined && v !== null && v !== ''
        )
      ),
    };
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

  // params may include viewMode: 'my' | 'all' (for admin toggle)
  getPackageAnalytics: async (packageId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/package/${packageId}`, { params: cleanParams });
    return response.data;
  },

  // params may include viewMode: 'my' | 'all' (for admin toggle)
  getClientAnalytics: async (clientId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/client/${clientId}`, { params: cleanParams });
    return response.data;
  },

  // params may include viewMode: 'my' | 'all' (for admin toggle)
  getEmployeeAnalytics: async (employeeId, params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const response = await api.get(`/analytics/employee/${employeeId}`, { params: cleanParams });
    return response.data;
  },
};

