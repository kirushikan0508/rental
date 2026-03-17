/**
 * @file middleware/index.ts
 * @description Barrel exports for all gateway middleware.
 */

export { authMiddleware } from './auth.middleware';
export { rateLimitMiddleware } from './rateLimit.middleware';
export { requestLoggerMiddleware } from './logger.middleware';
export { globalErrorHandler, notFoundHandler, GatewayError } from './errorHandler';
