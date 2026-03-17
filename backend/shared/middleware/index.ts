/**
 * @file shared/middleware/index.ts
 * @description Barrel exports for all shared middleware.
 */

export { authenticate, authorize } from './auth.middleware';
export {
  errorHandler,
  AppError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from './error.middleware';
