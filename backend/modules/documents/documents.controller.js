import { successResponse, errorResponse } from '../../helpers/response.js';
import { getSignedUrl } from '../../helpers/s3Storage.js';
import Client from '../client/client.model.js';

export const getSignedUrlForDocument = async (req, res, next) => {
    try {
        const { key } = req.params;
        const expiresIn = parseInt(req.query.expiresIn) || 3600;

        if (!key || typeof key !== 'string') {
            return errorResponse(res, 400, 'Document key is required');
        }

        const ownsDocument = await Client.exists({ 'documents.key': key });
        if (!ownsDocument) {
            return errorResponse(res, 404, 'Document not found');
        }

        const url = await getSignedUrl(key, expiresIn);
        return successResponse(res, 200, 'Signed URL generated successfully', { url, expiresIn });
    } catch (error) {
        next(error);
    }
};

