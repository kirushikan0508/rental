/**
 * @file gateway/src/middleware/index.ts
 * @description Gateway middleware — JWT verification, rate limiting, request logging.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Extracts and validates JWT from the Authorization header.
 * Attaches decoded payload to `req.user`.
 */
export const authenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
  // TODO: Implement JWT verification via shared auth middleware
  next();
};

/**
 * Request‐level logging middleware for gateway tracing.
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  console.log(`[Gateway] ${req.method} ${req.originalUrl}`);
  next();
};
