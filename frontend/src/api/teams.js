import api from './axios';

export const teamsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/teams', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/teams', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/teams/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/teams/${id}`);
    return response.data;
  },

  getByManager: async (managerId) => {
    const response = await api.get(`/teams/manager/${managerId}`);
    return response.data;
  },

  getByMember: async (employeeId) => {
    const response = await api.get(`/teams/member/${employeeId}`);
    return response.data;
  },
};

