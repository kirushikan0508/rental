/**
 * @file middleware/errorHandler.ts
 * @description Global error handler for vehicle-service.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
}

export function globalErrorHandler(err: Error & { statusCode?: number; code?: string }, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  logger.error(`[${statusCode}] ${err.message}`, { stack: err.stack });
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: config.isProduction && statusCode >= 500 ? 'Internal server error' : err.message,
      ...(config.isProduction ? {} : { stack: err.stack }),
    },
  });
}
