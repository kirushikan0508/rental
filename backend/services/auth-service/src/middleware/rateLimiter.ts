/**
 * @file middleware/rateLimiter.ts
 * @description Redis-based rate limiter for brute force protection.
 * Tracks login attempts per IP and enforces lockout after threshold.
 */

import { Request, Response, NextFunction } from 'express';
import { getLoginAttempts } from '../utils/redis.util';
import { config } from '../config';

/**
 * Express middleware that checks login attempt count before allowing
 * authentication requests to proceed. If the IP has exceeded the
 * max allowed attempts, returns 429 Too Many Requests.
 *
 * Should be applied to login-related routes only.
 */
export async function loginRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const attempts = await getLoginAttempts(ip);

  if (attempts >= config.rateLimit.maxLoginAttempts) {
    const lockoutMinutes = Math.ceil(config.rateLimit.loginLockoutSeconds / 60);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many failed login attempts. Please try again in ${lockoutMinutes} minutes.`,
      },
    });
    return;
  }

  next();
}
