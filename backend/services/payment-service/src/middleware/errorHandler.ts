/**
 * @file middleware/errorHandler.ts
 * @description Central error handler for payment-service.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { PaymentError } from '../services/payment.service';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';

  if (err instanceof PaymentError) {
    statusCode = err.statusCode;
    code = 'PAYMENT_ERROR';
    message = err.message;
  } else if (err.type === 'StripeCardError' || err.type === 'StripeInvalidRequestError') {
    statusCode = 400;
    code = 'STRIPE_ERROR';
    message = err.message;
  } else if (err.code === 'P2002') { // Prisma unique constraint violation
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Resource already exists';
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
