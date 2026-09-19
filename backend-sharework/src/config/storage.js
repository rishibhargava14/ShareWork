import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

let s3Client;

export const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return s3Client;
};

export const getStorageBucket = () => env.AWS_BUCKET;
