import { randomBytes } from 'node:crypto';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { getS3Client, getStorageBucket } from '../config/storage.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';

const sanitizeFileName = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

const toBuffer = async (body) => {
  if (!body) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const uploadToS3 = async (files, { prefix = 'upload', ownerId } = {}) => {
  const client = getS3Client();
  const bucket = getStorageBucket();
  const uploaded = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.originalname);
    const key = `sharework/${prefix}/${ownerId || 'anon'}/${Date.now()}-${randomBytes(8).toString('hex')}-${safeName}`;

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch {
      throw new AppError('File upload failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    uploaded.push({
      storageKey: key,
      originalName: file.originalname || safeName,
      mimeType: file.mimetype,
      size: Number(file.size || file.buffer?.length || 0),
    });
  }

  return uploaded;
};

const downloadFromS3 = async (storageKey) => {
  const client = getS3Client();
  const bucket = getStorageBucket();

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
    );
    return toBuffer(result.Body);
  } catch {
    throw new AppError('File download failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

let fileUploader = uploadToS3;
let fileDownloader = downloadFromS3;

export const uploadFiles = async (files = [], options = {}) => {
  if (!files.length) {
    return [];
  }

  return fileUploader(files, options);
};

export const downloadFileBuffer = async (storageKey) => {
  if (!storageKey) {
    throw new AppError('File not found', HTTP_STATUS.NOT_FOUND);
  }

  return fileDownloader(storageKey);
};

export const uploadPortfolioImages = async (files = [], options = {}) =>
  uploadFiles(files, { ...options, prefix: options.prefix || 'portfolio' });

export const setFileUploader = (uploader) => {
  fileUploader = uploader;
};

export const setFileDownloader = (downloader) => {
  fileDownloader = downloader;
};

export const setPortfolioUploader = (uploader) => {
  fileUploader = uploader;
};

export const resetPortfolioUploader = () => {
  fileUploader = uploadToS3;
  fileDownloader = downloadFromS3;
};

export const resetFileHandlers = () => {
  fileUploader = uploadToS3;
  fileDownloader = downloadFromS3;
};
