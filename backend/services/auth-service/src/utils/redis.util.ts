/**
 * @file utils/redis.util.ts
 * @description Redis client singleton with typed helper methods for
 * sessions, OTP storage, rate limiting, and token blacklisting.
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

// ─── Redis Client Singleton ────────────────────────────────

let redisClient: Redis | null = null;

/**
 * Returns the singleton Redis client, creating it on first call.
 * Attaches event listeners for connection monitoring.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) {
          logger.error('Redis: max retries reached, giving up');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: false,
    });

    redisClient.on('connect', () => logger.info('🔴 Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  }
  return redisClient;
}

/**
 * Gracefully disconnects the Redis client.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('🔴 Redis disconnected');
  }
}

// ═══════════════════════════════════════════════════════════
// Session / Refresh Token Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Stores a refresh token in Redis keyed by userId.
 * TTL: 7 days (matches refresh token expiry).
 *
 * @param userId - The user's unique identifier
 * @param refreshToken - The JWT refresh token to store
 */
export async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const redis = getRedisClient();
  const key = `session:${userId}`;
  await redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60);
}

/**
 * Retrieves a stored refresh token for the given user.
 *
 * @param userId - The user's unique identifier
 * @returns The stored refresh token, or null if expired/missing
 */
export async function getRefreshToken(userId: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(`session:${userId}`);
}

/**
 * Deletes the refresh token for a user (used on logout).
 *
 * @param userId - The user's unique identifier
 */
export async function deleteRefreshToken(userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`session:${userId}`);
}

// ═══════════════════════════════════════════════════════════
// Token Blacklist
// ═══════════════════════════════════════════════════════════

/**
 * Blacklists an access token (used on logout). TTL matches
 * the remaining lifetime of the token.
 *
 * @param token - The JWT access token to invalidate
 * @param ttlSeconds - Remaining time until the token expires
 */
export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`blacklist:${token}`, '1', 'EX', ttlSeconds);
}

/**
 * Checks whether an access token has been blacklisted.
 *
 * @param token - The JWT access token to check
 * @returns true if the token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.get(`blacklist:${token}`);
  return result !== null;
}

// ═══════════════════════════════════════════════════════════
// OTP Storage
// ═══════════════════════════════════════════════════════════

/**
 * Stores an OTP code for a given identifier (email or phone).
 * TTL defaults to 5 minutes.
 *
 * @param identifier - Email or phone number
 * @param otp - The generated OTP code
 */
export async function storeOtp(identifier: string, otp: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`otp:${identifier}`, otp, 'EX', config.otp.expirySeconds);
}

/**
 * Retrieves a stored OTP for the given identifier.
 *
 * @param identifier - Email or phone number
 * @returns The OTP code, or null if expired
 */
export async function getOtp(identifier: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(`otp:${identifier}`);
}

/**
 * Deletes an OTP after successful verification.
 *
 * @param identifier - Email or phone number
 */
export async function deleteOtp(identifier: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`otp:${identifier}`);
}

// ═══════════════════════════════════════════════════════════
// Rate Limiting (Login Attempts)
// ═══════════════════════════════════════════════════════════

/**
 * Increments the failed login attempt counter for an IP address.
 * Sets a TTL on first attempt.
 *
 * @param ip - Client IP address
 * @returns Current attempt count after increment
 */
export async function incrementLoginAttempts(ip: string): Promise<number> {
  const redis = getRedisClient();
  const key = `login_attempts:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, config.rateLimit.loginLockoutSeconds);
  }
  return count;
}

/**
 * Returns the current failed login attempt count for an IP.
 *
 * @param ip - Client IP address
 * @returns Current attempt count (0 if no attempts recorded)
 */
export async function getLoginAttempts(ip: string): Promise<number> {
  const redis = getRedisClient();
  const count = await redis.get(`login_attempts:${ip}`);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Resets the login attempt counter (on successful login).
 *
 * @param ip - Client IP address
 */
export async function resetLoginAttempts(ip: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`login_attempts:${ip}`);
}

// ═══════════════════════════════════════════════════════════
// OTP Rate Limiting
// ═══════════════════════════════════════════════════════════

/**
 * Checks if an OTP resend is on cooldown (60 second minimum between sends).
 *
 * @param identifier - Email or phone number
 * @returns true if still in cooldown period
 */
export async function isOtpCooldown(identifier: string): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.get(`otp_cooldown:${identifier}`);
  return result !== null;
}

/**
 * Sets the OTP resend cooldown for an identifier (60 seconds).
 *
 * @param identifier - Email or phone number
 */
export async function setOtpCooldown(identifier: string): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`otp_cooldown:${identifier}`, '1', 'EX', 60);
}
