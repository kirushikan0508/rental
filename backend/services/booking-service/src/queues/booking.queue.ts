/**
 * @file queues/booking.queue.ts
 * @description BullMQ queue for async booking jobs (reminders, auto-expiry).
 */

import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../utils/redis.util';
import { Booking, BookingStatus } from '../models';
import { emitNotification } from '../socket';
import { logger } from '../utils/logger';

export const bookingQueueName = 'booking-jobs';

export const bookingQueue = new Queue(bookingQueueName, {
  connection: getRedisClient(),
});

/**
 * Adds a job to send a reminder 1 hour before the booking starts.
 */
export async function scheduleBookingReminder(bookingId: string, startDate: Date) {
  const reminderTime = new Date(startDate.getTime() - 60 * 60 * 1000); // 1 hour before
  const delay = reminderTime.getTime() - Date.now();

  if (delay > 0) {
    await bookingQueue.add(
      'booking-reminder',
      { bookingId },
      { delay, jobId: `reminder-${bookingId}` }
    );
    logger.debug(`Scheduled reminder for booking ${bookingId}`);
  }
}

/**
 * Adds a job to auto-expire a pending booking if not confirmed within 24 hours.
 */
export async function scheduleAutoExpire(bookingId: string) {
  const delay = 24 * 60 * 60 * 1000; // 24 hours
  await bookingQueue.add(
    'booking-expire',
    { bookingId },
    { delay, jobId: `expire-${bookingId}` }
  );
}

// ─── Worker ─────────────────────────────────────────────────

export const bookingWorker = new Worker(
  bookingQueueName,
  async (job: Job) => {
    logger.info(`Processing job ${job.name} for booking ${job.data.bookingId}`);

    if (job.name === 'booking-reminder') {
      const booking = await Booking.findById(job.data.bookingId);
      if (booking && booking.status === BookingStatus.CONFIRMED) {
        emitNotification(booking.renterId, 'BOOKING_REMINDER', {
          message: `Your booking for ${booking.vehicleTitle} starts in 1 hour.`,
          bookingId: booking._id,
        });
      }
    }

    if (job.name === 'booking-expire') {
      const booking = await Booking.findById(job.data.bookingId);
      if (booking && booking.status === BookingStatus.PENDING) {
        booking.status = BookingStatus.EXPIRED;
        booking.statusHistory.push({ status: BookingStatus.EXPIRED, changedBy: 'SYSTEM', timestamp: new Date() });
        await booking.save();

        emitNotification(booking.renterId, 'BOOKING_EXPIRED', {
          message: `Your booking request for ${booking.vehicleTitle} has expired.`,
          bookingId: booking._id,
        });
        emitNotification(booking.ownerId, 'BOOKING_EXPIRED', {
          message: `Booking request ${booking.bookingNumber} has expired.`,
          bookingId: booking._id,
        });
        
        // TODO: Publish event to unblock dates in Vehicle Service
      }
    }
  },
  { connection: getRedisClient() }
);

bookingWorker.on('completed', (job: Job) => {
  logger.debug(`Job ${job.id} has completed!`);
});

bookingWorker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`Job ${job?.id} has failed with ${err.message}`);
});
