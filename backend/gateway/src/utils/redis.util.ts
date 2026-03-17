/**
 * @file utils/redis.util.ts
 * @description Redis client singleton for the API Gateway.
 * Used by the rate limiter and health check modules.
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

// ─── Redis Client Singleton ────────────────────────────────

let redisClient: Redis | null = null;

/**
 * Returns the singleton Redis client, creating it on first call.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) {
          logger.error('Redis: max retries reached');
          return null;
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
