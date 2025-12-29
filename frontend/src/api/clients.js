import api from './axios';

export const clientsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getById: async (id, params = {}) => {
    const response = await api.get(`/clients/${id}`, { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/clients', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  uploadDocument: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/clients/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteDocument: async (id, documentId) => {
    const response = await api.delete(`/clients/${id}/documents/${documentId}`);
    return response.data;
  },

  assignDocument: async (id, documentId, personId) => {
    const response = await api.patch(`/clients/${id}/documents/${documentId}/assign`, {
      personId,
    });
    return response.data;
  },

  uploadDocumentByType: async (id, category, file, personId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (personId) {
      formData.append('personId', personId);
    }
    const response = await api.post(`/clients/${id}/documents/${category}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  processDocument: async (id, documentId) => {
    const response = await api.post(`/clients/${id}/documents/${documentId}/process`);
    return response.data;
  },

  verifyDocument: async (id, documentId, verifiedFields = []) => {
    const response = await api.patch(`/clients/${id}/documents/${documentId}/verify`, {
      verifiedFields,
    });
    return response.data;
  },

  updateBusinessInfo: async (id, data) => {
    const response = await api.patch(`/clients/${id}/business-info`, data);
    return response.data;
  },

  addPartner: async (id, data) => {
    const response = await api.post(`/clients/${id}/partners`, data);
    return response.data;
  },

  updatePartner: async (id, personId, data) => {
    const response = await api.patch(`/clients/${id}/partners/${personId}`, data);
    return response.data;
  },

  deletePartner: async (id, personId) => {
    const response = await api.delete(`/clients/${id}/partners/${personId}`);
    return response.data;
  },

  addManager: async (id, data) => {
    const response = await api.post(`/clients/${id}/managers`, data);
    return response.data;
  },

  updateManager: async (id, personId, data) => {
    const response = await api.patch(`/clients/${id}/managers/${personId}`, data);
    return response.data;
  },

  deleteManager: async (id, personId) => {
    const response = await api.delete(`/clients/${id}/managers/${personId}`);
    return response.data;
  },

  getComplianceStatus: async (id) => {
    const response = await api.get(`/clients/${id}/compliance`);
    return response.data;
  },

  updateEmaraTaxCredentials: async (id, data) => {
    const response = await api.patch(`/clients/${id}/emaratax-credentials`, data);
    return response.data;
  },

  getAllAlerts: async (params = {}) => {
    const response = await api.get('/clients/alerts/all', { params });
    return response.data;
  },

  getNextSubmissionDates: async () => {
    const response = await api.get('/clients/submission-dates/next');
    return response.data;
  },

  getCalendarEvents: async (params = {}) => {
    const response = await api.get('/clients/calendar-events', { params });
    return response.data;
  },

  bulkUploadClients: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/clients/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onUploadProgress
        ? (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(percentCompleted);
          }
        : undefined,
    });
    return response.data;
  },
};

