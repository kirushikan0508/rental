/**
 * @file config/index.ts
 * @description Centralized environment configuration with Zod validation.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3004),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),

  // Lock Config
  LOCK_TTL_SECONDS: z.coerce.number().default(30),
  LOCK_RETRY_DELAY_MS: z.coerce.number().default(200),
  LOCK_RETRY_COUNT: z.coerce.number().default(10),

  // Cancellation Policy
  CANCEL_FULL_REFUND_HOURS: z.coerce.number().default(48),
  CANCEL_PARTIAL_REFUND_HOURS: z.coerce.number().default(24),
  CANCEL_PARTIAL_REFUND_PERCENT: z.coerce.number().default(50),

  // Loyalty Points
  LOYALTY_POINTS_PER_DOLLAR: z.coerce.number().default(1),
  LOYALTY_POINTS_CONVERSION_RATE: z.coerce.number().default(0.01),

  // Corporate
  CORPORATE_DISCOUNT_PERCENT: z.coerce.number().default(10),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid booking-service configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  mongoUri: parsed.data.MONGODB_URI,
  redisUrl: parsed.data.REDIS_URL,
  jwt: { accessSecret: parsed.data.JWT_ACCESS_SECRET },
  
  lock: {
    ttlSeconds: parsed.data.LOCK_TTL_SECONDS,
    retryDelayMs: parsed.data.LOCK_RETRY_DELAY_MS,
    retryCount: parsed.data.LOCK_RETRY_COUNT,
  },

  cancellation: {
    fullRefundHours: parsed.data.CANCEL_FULL_REFUND_HOURS,
    partialRefundHours: parsed.data.CANCEL_PARTIAL_REFUND_HOURS,
    partialRefundPercent: parsed.data.CANCEL_PARTIAL_REFUND_PERCENT,
  },

  loyalty: {
    pointsPerDollar: parsed.data.LOYALTY_POINTS_PER_DOLLAR,
    conversionRate: parsed.data.LOYALTY_POINTS_CONVERSION_RATE,
  },

  corporate: {
    discountPercent: parsed.data.CORPORATE_DISCOUNT_PERCENT,
  },

  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
  logLevel: parsed.data.LOG_LEVEL,
} as const;
