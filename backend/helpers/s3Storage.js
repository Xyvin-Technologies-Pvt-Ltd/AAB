import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Config } from '../config/aws.js';

/**
 * Upload a file to S3
 * @param {Object} file - File object from multer
 * @param {String} folder - Folder path in S3 (e.g., 'employees', 'clients')
 * @returns {Promise<Object>} - { url, key, name }
 */
export const uploadFile = async (file, folder = 'documents') => {
    try {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const key = `${folder}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: s3Config.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await s3Config.client.send(command);

        // Generate public URL (or use CloudFront if configured)
        const url = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;

        return {
            url,
            key,
            name: file.originalname,
        };
    } catch (error) {
        throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
};

/**
 * Delete a file from S3
 * @param {String} fileKey - S3 object key
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileKey) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: s3Config.bucket,
            Key: fileKey,
        });

        await s3Config.client.send(command);
    } catch (error) {
        throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
};

/**
 * Validate that an S3 key doesn't contain path traversal or dangerous characters
 */
function validateFileKey(fileKey) {
    if (!fileKey || typeof fileKey !== 'string') {
        throw new Error('Invalid file key');
    }
    const normalized = fileKey.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/') || /[\x00-\x1f]/.test(normalized)) {
        throw new Error('Invalid file key: contains forbidden characters or path traversal');
    }
    return normalized;
}

/**
 * Get a signed URL for temporary file access
 * @param {String} fileKey - S3 object key
 * @param {Number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour, max: 86400 = 24 hours)
 * @returns {Promise<String>} - Signed URL
 */
export const getSignedUrl = async (fileKey, expiresIn = 3600) => {
    try {
        const sanitizedKey = validateFileKey(fileKey);
        const clampedExpiry = Math.min(Math.max(expiresIn, 60), 86400);

        const command = new GetObjectCommand({
            Bucket: s3Config.bucket,
            Key: sanitizedKey,
        });

        const url = await getS3SignedUrl(s3Config.client, command, { expiresIn: clampedExpiry });
        return url;
    } catch (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
};

