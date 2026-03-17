/**
 * @file middleware/errorHandler.ts
 * @description Global error handler.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { BookingError } from '../services/booking.service';
import { LockError } from '../utils/lock.util';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';

  if (err instanceof BookingError) {
    statusCode = err.statusCode;
    code = 'BOOKING_ERROR';
    message = err.message;
  } else if (err instanceof LockError) {
    statusCode = 409;
    code = 'LOCK_ERROR';
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = err.message;
  } else if (err.message) {
     statusCode = err.statusCode || 400;
     code = 'BAD_REQUEST';
     message = err.message;
  }

  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`[${statusCode}] ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
