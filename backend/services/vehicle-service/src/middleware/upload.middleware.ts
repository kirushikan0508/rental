/**
 * @file middleware/upload.middleware.ts
 * @description Multer configuration for in-memory file uploads.
 */

import multer from 'multer';
import { config } from '../config';

/**
 * Multer instance configured for vehicle image uploads.
 * Uses memory storage (files stay in buffer for S3 upload).
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxImageSizeBytes,
    files: config.upload.maxImagesPerVehicle,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`));
    }
  },
});

/**
 * Multer instance for document uploads (PDF, images).
 */
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxDocumentSizeBytes,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG`));
    }
  },
});
