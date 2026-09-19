import multer from 'multer';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { AppError } from '../utils/AppError.js';

const MAX_PORTFOLIO_FILES = 8;
const MAX_DELIVERABLE_FILES = 8;
const MAX_CHAT_FILES = 1;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const isAllowedStoredType = (mimetype) =>
  mimetype.startsWith('image/') ||
  mimetype === 'application/pdf' ||
  mimetype.includes('zip');

const mapMulterError = (error) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_COUNT') {
      return new AppError('Too many files', HTTP_STATUS.BAD_REQUEST);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError('File too large', HTTP_STATUS.BAD_REQUEST);
    }

    return new AppError(error.message, HTTP_STATUS.BAD_REQUEST);
  }

  return error;
};

const createMemoryUpload = ({ files }) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files,
    },
    fileFilter: (_req, file, callback) => {
      if (isAllowedStoredType(file.mimetype)) {
        callback(null, true);
        return;
      }

      callback(new AppError('Invalid file type', HTTP_STATUS.BAD_REQUEST));
    },
  });

const portfolioUpload = createMemoryUpload({ files: MAX_PORTFOLIO_FILES });
const deliverableUpload = createMemoryUpload({ files: MAX_DELIVERABLE_FILES });
const chatUpload = createMemoryUpload({ files: MAX_CHAT_FILES });

const isMultipart = (req) => String(req.headers['content-type'] || '').includes('multipart/form-data');

export const uploadPortfolioImages = (req, res, next) => {
  if (!isMultipart(req)) {
    next();
    return;
  }

  portfolioUpload.array('portfolioImages', MAX_PORTFOLIO_FILES)(req, res, (error) => {
    if (error) {
      next(mapMulterError(error));
      return;
    }

    next();
  });
};

export const uploadDeliverableFiles = (req, res, next) => {
  if (!isMultipart(req)) {
    next();
    return;
  }

  deliverableUpload.array('files', MAX_DELIVERABLE_FILES)(req, res, (error) => {
    if (error) {
      next(mapMulterError(error));
      return;
    }

    next();
  });
};

export const uploadChatAttachment = (req, res, next) => {
  if (!isMultipart(req)) {
    next();
    return;
  }

  chatUpload.single('file')(req, res, (error) => {
    if (error) {
      next(mapMulterError(error));
      return;
    }

    if (req.file && !req.body.type) {
      req.body.type = 'file';
    }

    next();
  });
};
