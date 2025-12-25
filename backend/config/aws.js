import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export const s3Config = {
    client: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    region: process.env.AWS_REGION || 'us-east-1',
};

export default s3Client;

