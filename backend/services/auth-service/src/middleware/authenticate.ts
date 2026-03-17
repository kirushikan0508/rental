/**
 * @file middleware/authenticate.ts
 * @description JWT authentication middleware. Extracts the Bearer token
 * from the Authorization header, verifies it, checks the blacklist,
 * and attaches the decoded payload to `req.user`.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../utils/jwt.util';
import { isTokenBlacklisted } from '../utils/redis.util';
import { logger } from '../utils/logger';

// ─── Augment Express Request ────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Decoded JWT payload — populated by authenticate middleware */
      user?: DecodedToken;
      /** Raw access token — used for blacklisting on logout */
      accessToken?: string;
    }
  }
}

/**
 * Express middleware that verifies the JWT access token.
 *
 * - Extracts the token from the `Authorization: Bearer <token>` header
 * - Verifies signature and expiry
 * - Checks the Redis blacklist (for logged-out tokens)
 * - Attaches decoded payload to `req.user`
 *
 * Returns 401 Unauthorized if any check fails.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been blacklisted (logged out)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' },
      });
      return;
    }

    // Verify token signature and claims
    const decoded = verifyAccessToken(token);

    // Attach to request for downstream handlers
    req.user = decoded;
    req.accessToken = token;

    next();
  } catch (error) {
    logger.warn('Authentication failed:', error instanceof Error ? error.message : error);
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
    });
  }
}
