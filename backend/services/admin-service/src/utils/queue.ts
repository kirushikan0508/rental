import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Queue for scheduling platform announcements
export const announcementQueue = new Queue('announcements', redisUrl);

announcementQueue.on('error', (error) => {
  console.error('Bull Announcement Queue Error:', error);
});
