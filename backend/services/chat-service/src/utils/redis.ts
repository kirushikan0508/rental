import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
  private static instance: Redis;

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      RedisClient.instance.on('connect', () => {
        console.log('ðŸš€ Redis connected successfully (chat-service)');
      });

      RedisClient.instance.on('error', (err) => {
        console.error('â Œ Redis connection error:', err);
      });
    }

    return RedisClient.instance;
  }

  public static async close(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
    }
  }
}

export const redisClient = RedisClient.getInstance();
