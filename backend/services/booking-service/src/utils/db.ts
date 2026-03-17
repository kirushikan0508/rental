/**
 * @file utils/db.ts
 * @description MongoDB connection utility for Mongoose.
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri);
    logger.info('🟢 MongoDB connected (Booking Service)');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('🟡 MongoDB disconnected');
}
