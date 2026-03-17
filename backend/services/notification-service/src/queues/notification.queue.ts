import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../utils/redis';
import { NotificationRouter, NotificationPayload } from '../services/notification.router';
import { Notification as NotificationLog } from '../models/Notification';

const QUEUE_NAME = 'notificationQueue';

// 1. Initialize Queue
export const notificationQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

// 2. Initialize Worker
export const startNotificationWorker = () => {
  const worker = new Worker(QUEUE_NAME, async (job: Job<NotificationPayload>) => {
    console.log(`[Worker] Processing job ${job.id} of type ${job.data.type}`);
    
    try {
      // Use the router to send across channels
      await NotificationRouter.routeNotification(job.data);
      
      // Update DB Log status
      await NotificationLog.findOneAndUpdate(
        { userId: job.data.userId, type: job.data.type, status: 'PENDING' },
        { status: 'SENT' }
      );
    } catch (err: any) {
      console.error(`[Worker] Job ${job.id} failed:`, err);
      
      await NotificationLog.findOneAndUpdate(
         { userId: job.data.userId, type: job.data.type, status: 'PENDING' },
         { status: 'FAILED', errorMessage: err.message }
      );
      
      throw err; // Allow BullMQ to retry if attempts remain
    }
  }, { connection: redisConnection });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Permanent failure for job ${job?.id}:`, err);
  });

  console.log('ðŸš€ Notification Worker started');
};
