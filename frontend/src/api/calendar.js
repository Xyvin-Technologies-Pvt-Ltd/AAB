import api from './axios';

export const calendarApi = {
  generateToken: async () => {
    const response = await api.post('/calendar/generate-token');
    return response.data;
  },

  revokeToken: async () => {
    const response = await api.delete('/calendar/revoke-token');
    return response.data;
  },
};
