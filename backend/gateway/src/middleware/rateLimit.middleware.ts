/**
 * @file middleware/rateLimit.middleware.ts
 * @description Redis-based rate limiter with tiered limits per service.
 *
 * Tiers:
 *   - global:  100 req/min per IP (default)
 *   - auth:     10 req/min per IP (login/register)
 *   - payment:  20 req/min per user (payment endpoints)
 *
 * Uses Redis INCR with EXPIRE for sliding window approximation.
 * Returns standard 429 response with Retry-After header.
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../utils/redis.util';
import { getServiceForPath } from '../config/services.config';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Rate Limit Tier Config ────────────────────────────────

interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

const tiers: Record<string, RateLimitConfig> = {
  global: config.rateLimit.global,
  auth: config.rateLimit.auth,
  payment: config.rateLimit.payment,
};

/**
 * Redis-based rate limiter middleware.
 *
 * Determines the rate limit tier from the service registry,
 * builds a key based on IP (or userId for payment tier),
 * and enforces the limit using Redis INCR + TTL.
 *
 * Response headers added:
 *   X-RateLimit-Limit: max requests allowed
 *   X-RateLimit-Remaining: requests remaining
 *   X-RateLimit-Reset: Unix timestamp when the window resets
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const redis = getRedisClient();

    // Determine rate limit tier for this route
    const service = getServiceForPath(req.path);
    const tierName = service?.rateLimitTier || 'global';
    const tierConfig = tiers[tierName] || tiers.global;

    // Build the rate limit key
    // Payment tier uses userId; everything else uses IP
    const identifier = tierName === 'payment' && req.user?.userId
      ? `user:${req.user.userId}`
      : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;

    const key = `ratelimit:${tierName}:${identifier}`;

    // Increment the counter
    const current = await redis.incr(key);

    // Set TTL on first request in the window
    if (current === 1) {
      await redis.expire(key, tierConfig.windowSeconds);
    }

    // Get remaining TTL for Retry-After header
    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, tierConfig.max - current);
    const resetAt = Math.ceil(Date.now() / 1000) + ttl;

    // Set rate limit response headers
    res.setHeader('X-RateLimit-Limit', tierConfig.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetAt);

    // Check if limit is exceeded
    if (current > tierConfig.max) {
      logger.warn(
        `Rate limited: ${identifier} on ${req.path} (${tierName} tier, ${current}/${tierConfig.max})`,
      );

      res.setHeader('Retry-After', ttl);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Limit: ${tierConfig.max} per ${tierConfig.windowSeconds}s. Retry after ${ttl}s.`,
          details: {
            limit: tierConfig.max,
            remaining: 0,
            resetAt,
            retryAfter: ttl,
          },
        },
      });
      return;
    }

    next();
  } catch (error) {
    // Rate limiter failure should not block requests — log and proceed
    logger.error('Rate limiter error (allowing request):', error);
    next();
  }
}
