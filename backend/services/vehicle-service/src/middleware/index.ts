/**
 * @file middleware/index.ts
 * @description Barrel exports for all vehicle-service middleware.
 */

export { authenticate } from './authenticate';
export { authorize } from './authorize';
export { validate, validateQuery } from './validate';
export { notFoundHandler, globalErrorHandler } from './errorHandler';
export { imageUpload, documentUpload } from './upload.middleware';
