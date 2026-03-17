/**
 * @file queues/payout.queue.ts
 * @description BullMQ queue for processing async payouts and emails.
 */

import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../utils/redis.util';
import { processPayoutForBooking } from '../services/payout.service';
import { generateAndEmailInvoice } from '../services/invoice.service';
import { logger } from '../utils/logger';

export const paymentQueueName = 'payment-jobs';

export const paymentQueue = new Queue(paymentQueueName, {
  connection: getRedisClient(),
});

export async function schedulePayoutAndInvoice(bookingId: string) {
  // Add to queue
  await paymentQueue.add(
    'process-booking-completion',
    { bookingId },
    { 
      jobId: `completion-${bookingId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 }
    }
  );
  logger.debug(`Scheduled payout and invoice job for booking ${bookingId}`);
}

// ─── Worker ─────────────────────────────────────────────────

export const paymentWorker = new Worker(
  paymentQueueName,
  async (job: Job) => {
    logger.info(`Processing job ${job.name} for booking ${job.data.bookingId}`);

    if (job.name === 'process-booking-completion') {
      const { bookingId } = job.data;

      // 1. Process Payout
      try {
        await processPayoutForBooking(bookingId);
      } catch (error: any) {
        logger.warn(`Failed to process payout for ${bookingId}: ${error.message}`);
        // Often we don't fail the whole job if payout fails due to onboarding, etc.
        // We log and let the invoice proceed. Alternatively, throw to retry.
      }

      // 2. Email Invoice
      try {
        await generateAndEmailInvoice(bookingId);
      } catch (error: any) {
         logger.warn(`Failed to email invoice for ${bookingId}: ${error.message}`);
         throw error; // Let BullMQ retry
      }
    }
  },
  { connection: getRedisClient() }
);

paymentWorker.on('completed', (job: Job) => {
  logger.debug(`Job ${job.id} has completed!`);
});

paymentWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`Job ${job?.id} has failed with ${err.message}`);
});
