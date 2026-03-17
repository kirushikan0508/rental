/**
 * @file middleware/auth.middleware.ts
 * @description JWT authentication middleware for the API Gateway.
 *
 * Verifies the Bearer token, decodes the payload, and forwards
 * user identity to downstream services via custom headers:
 *   X-User-Id, X-User-Email, X-User-Role
 *
 * Works in conjunction with the service registry — only enforces
 * auth on services/paths that require it.
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';
import { getServiceForPath, isPublicPath } from '../config/services.config';
import { logger } from '../utils/logger';

// ─── Decoded Token Interface ────────────────────────────────

interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ─── Augment Express Request ────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Decoded JWT payload — populated by gateway auth middleware */
      user?: DecodedToken;
    }
  }
}

/**
 * Gateway authentication middleware.
 *
 * - Looks up the target service from the route
 * - Skips auth for public paths and public services
 * - Verifies JWT and attaches user info to headers for downstream
 *
 * @returns 401 if token is missing/invalid/expired on protected routes
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Find which service this request is for
  const service = getServiceForPath(req.path);

  // If no matching service, let it through (will 404 later)
  if (!service) {
    next();
    return;
  }

  // Check if this specific path is public
  if (isPublicPath(service, req.path)) {
    // Still attempt to decode token if present (optional auth)
    const token = extractToken(req);
    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
        attachUserHeaders(req, decoded);
      } catch {
        // Invalid token on public route — just ignore
      }
    }
    next();
    return;
  }

  // ─── Protected route — token is required ─────────────────

  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required',
      },
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    attachUserHeaders(req, decoded);
    next();
  } catch (error) {
    const message = error instanceof jwt.TokenExpiredError
      ? 'Access token has expired'
      : 'Invalid access token';

    logger.warn(`Auth failed on ${req.path}: ${message}`);

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Extracts the JWT from the Authorization: Bearer header.
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

/**
 * Verifies and decodes a JWT access token.
 */
function verifyToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'rental-auth-service',
    audience: 'rental-platform',
  }) as DecodedToken;
}

/**
 * Attaches user identity to request headers so downstream
 * services can read them without re-verifying the JWT.
 */
function attachUserHeaders(req: Request, user: DecodedToken): void {
  req.headers['x-user-id'] = user.userId;
  req.headers['x-user-email'] = user.email;
  req.headers['x-user-role'] = user.role;
}
