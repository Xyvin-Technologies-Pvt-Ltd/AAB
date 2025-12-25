import api from './axios';

export const uploadApi = {
    getSignedUrl: async (key, expiresIn = 3600) => {
        const response = await api.get(`/documents/${key}/signed-url`, {
            params: { expiresIn },
        });
        return response.data;
    },
};

