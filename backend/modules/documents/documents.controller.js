import { successResponse } from '../../helpers/response.js';
import { getSignedUrl } from '../../helpers/s3Storage.js';

export const getSignedUrlForDocument = async (req, res, next) => {
    try {
        const { key } = req.params;
        const expiresIn = parseInt(req.query.expiresIn) || 3600; // Default 1 hour

        const url = await getSignedUrl(key, expiresIn);
        return successResponse(res, 200, 'Signed URL generated successfully', { url, expiresIn });
    } catch (error) {
        next(error);
    }
};

