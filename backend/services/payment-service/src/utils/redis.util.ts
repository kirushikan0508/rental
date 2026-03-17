/**
 * @file utils/redis.util.ts
 * @description Redis client for BullMQ and idempotency.
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let client: Redis | null = null;

export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    client.on('connect', () => logger.info('🔴 Redis connected'));
    client.on('error', (err) => logger.error('Redis error:', err));
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
