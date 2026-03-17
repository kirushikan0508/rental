/**
 * @file utils/lock.util.ts
 * @description Distributed locking mechanism using Redis to prevent double booking.
 * Simple implementation for single-node Redis using SET NX PX.
 */

import { getRedisClient } from './redis.util';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export class LockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LockError';
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Attempts to acquire a Redis lock for a given key.
 * 
 * @param key - The resource to lock (e.g. `vehicle:123:dates`)
 * @returns A unique lock value to be used for releasing
 * @throws LockError if the lock cannot be acquired after retries
 */
export async function acquireLock(key: string): Promise<string> {
  const redis = getRedisClient();
  const lockKey = `lock:${key}`;
  const lockValue = uuidv4();
  const ttlMs = config.lock.ttlSeconds * 1000;

  for (let attempt = 1; attempt <= config.lock.retryCount; attempt++) {
    // SET key value NX (only if not exists) PX (expire after ms)
    const result = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
    
    if (result === 'OK') {
      logger.debug(`🔒 Lock acquired: ${lockKey}`);
      return lockValue;
    }
    
    // Wait and retry
    await delay(config.lock.retryDelayMs);
  }

  logger.warn(`Failed to acquire lock: ${lockKey}`);
  throw new LockError('Resource is currently locked by another process. Please try again.');
}

/**
 * Releases a previously acquired Redis lock.
 * Uses a basic Lua script to ensure we only delete the lock if we own it (value matches).
 * 
 * @param key - The resource string
 * @param lockValue - The unique value returned by acquireLock
 */
export async function releaseLock(key: string, lockValue: string): Promise<void> {
  const redis = getRedisClient();
  const lockKey = `lock:${key}`;
  
  const luaScript = `
    if redis.call("get",KEYS[1]) == ARGV[1] then
      return redis.call("del",KEYS[1])
    else
      return 0
    end
  `;
  
  await redis.eval(luaScript, 1, lockKey, lockValue);
  logger.debug(`🔓 Lock released: ${lockKey}`);
}
