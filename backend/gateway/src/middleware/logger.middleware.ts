/**
 * @file middleware/logger.middleware.ts
 * @description Request/response logging middleware.
 *
 * Logs every request with: method, path, status code, response time,
 * content length, user ID (if authenticated), and client IP.
 *
 * Generates a request correlation ID (X-Request-Id) for tracing
 * across microservices.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Request logging middleware.
 *
 * - Generates a unique X-Request-Id for correlation
 * - Captures start time and logs on response finish
 * - Color-codes log level by status code group
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Generate correlation ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Capture start time
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    const contentLength = res.getHeader('content-length') || '-';
    const userId = req.headers['x-user-id'] || 'anonymous';

    const logData = {
      requestId,
      method,
      path: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      contentLength,
      userId,
      ip: ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // Log level based on status code
    if (statusCode >= 500) {
      logger.error(`${method} ${originalUrl} ${statusCode} ${duration}ms`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} ${statusCode} ${duration}ms`, logData);
    } else {
      logger.http(`${method} ${originalUrl} ${statusCode} ${duration}ms`, logData);
    }
  });

  next();
}
