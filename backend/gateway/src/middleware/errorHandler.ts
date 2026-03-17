/**
 * @file middleware/errorHandler.ts
 * @description Global error handler for the API Gateway.
 *
 * Catches unhandled errors from middleware/routes and returns a
 * consistent JSON error response. Strips stack traces in production.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

// ─── Custom Gateway Error ───────────────────────────────────

/** Typed error class for gateway-specific errors */
export class GatewayError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'GATEWAY_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'GatewayError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ─── 404 Not Found Handler ──────────────────────────────────

/**
 * Catches requests that don't match any route.
 * Must be registered AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

// ─── Global Error Handler ───────────────────────────────────

/**
 * Express error-handling middleware (4 arguments).
 * Catches all errors thrown or passed via `next(err)`.
 *
 * Response format:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "Human-readable message",
 *     details: { ... } // optional, only in development
 *   }
 * }
 */
export function globalErrorHandler(
  err: Error | GatewayError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Determine status code
  const statusCode = (err as GatewayError).statusCode || 500;
  const code = (err as GatewayError).code || 'INTERNAL_ERROR';

  // Log the error
  const logData = {
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: err.message,
    stack: err.stack,
  };

  if (statusCode >= 500) {
    logger.error('Unhandled gateway error:', logData);
  } else {
    logger.warn('Gateway error:', logData);
  }

  // Build response
  const response: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message: config.isProduction && statusCode >= 500
        ? 'An internal error occurred'
        : err.message,
    },
  };

  // Include details/stack in development only
  if (!config.isProduction) {
    (response.error as Record<string, unknown>).stack = err.stack;
    if ((err as GatewayError).details) {
      (response.error as Record<string, unknown>).details = (err as GatewayError).details;
    }
  }

  res.status(statusCode).json(response);
}
