/**
 * @file utils/redis.util.ts
 * @description Redis client singleton with vehicle caching helpers.
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let client: Redis | null = null;

/** Returns the Redis singleton client. */
export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
    });
    client.on('connect', () => logger.info('🔴 Redis connected'));
    client.on('error', (err) => logger.error('Redis error:', err));
  }
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (client) { await client.quit(); client = null; }
}

// ─── Vehicle Cache ──────────────────────────────────────────

/**
 * Caches a vehicle document in Redis.
 * @param vehicleId - Vehicle UUID
 * @param data - Serializable vehicle object
 */
export async function cacheVehicle(vehicleId: string, data: unknown): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`vehicle:${vehicleId}`, JSON.stringify(data), 'EX', config.cache.vehicleTtl);
}

/**
 * Retrieves a cached vehicle. Returns null on miss.
 */
export async function getCachedVehicle<T>(vehicleId: string): Promise<T | null> {
  const redis = getRedisClient();
  const raw = await redis.get(`vehicle:${vehicleId}`);
  return raw ? (JSON.parse(raw) as T) : null;
}

/** Invalidates a cached vehicle entry. */
export async function invalidateVehicleCache(vehicleId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`vehicle:${vehicleId}`);
}

// ─── Search Cache ───────────────────────────────────────────

/**
 * Caches search results keyed by a hash of the query parameters.
 */
export async function cacheSearch(queryHash: string, data: unknown): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`search:${queryHash}`, JSON.stringify(data), 'EX', config.cache.searchTtl);
}

export async function getCachedSearch<T>(queryHash: string): Promise<T | null> {
  const redis = getRedisClient();
  const raw = await redis.get(`search:${queryHash}`);
  return raw ? (JSON.parse(raw) as T) : null;
}
