import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl);

redisClient.on('connect', () => {
  console.log('ðŸŸ¢ Redis connected successfully in admin-service');
});

redisClient.on('error', (err) => {
  console.error('â Œ Redis Connection Error in admin-service:', err);
});
