/**
 * @file config/index.ts
 * @description Centralized environment configuration with Zod validation.
 * Fails fast on missing/invalid environment variables at startup.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// ─── Env Schema ─────────────────────────────────────────────

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT (must match auth-service secret)
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),

  // Service URLs
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  VEHICLE_SERVICE_URL: z.string().url().default('http://localhost:3003'),
  BOOKING_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  PAYMENT_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  TRACKING_SERVICE_URL: z.string().url().default('http://localhost:3006'),
  CHAT_SERVICE_URL: z.string().url().default('http://localhost:3007'),
  ADMIN_SERVICE_URL: z.string().url().default('http://localhost:3008'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:3009'),

  // Rate Limiting
  GLOBAL_RATE_LIMIT: z.coerce.number().default(100),
  GLOBAL_RATE_WINDOW_SECONDS: z.coerce.number().default(60),
  AUTH_RATE_LIMIT: z.coerce.number().default(10),
  AUTH_RATE_WINDOW_SECONDS: z.coerce.number().default(60),
  PAYMENT_RATE_LIMIT: z.coerce.number().default(20),
  PAYMENT_RATE_WINDOW_SECONDS: z.coerce.number().default(60),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Request Limits
  MAX_REQUEST_SIZE: z.string().default('10kb'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
  LOG_DIR: z.string().default('logs'),
});

// ─── Parse & Validate ───────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid gateway configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// ─── Export Typed Config ────────────────────────────────────

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,

  redisUrl: parsed.data.REDIS_URL,

  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
  },

  services: {
    authUrl: parsed.data.AUTH_SERVICE_URL,
    userUrl: parsed.data.USER_SERVICE_URL,
    vehicleUrl: parsed.data.VEHICLE_SERVICE_URL,
    bookingUrl: parsed.data.BOOKING_SERVICE_URL,
    paymentUrl: parsed.data.PAYMENT_SERVICE_URL,
    trackingUrl: parsed.data.TRACKING_SERVICE_URL,
    chatUrl: parsed.data.CHAT_SERVICE_URL,
    adminUrl: parsed.data.ADMIN_SERVICE_URL,
    aiUrl: parsed.data.AI_SERVICE_URL,
  },

  rateLimit: {
    global: {
      max: parsed.data.GLOBAL_RATE_LIMIT,
      windowSeconds: parsed.data.GLOBAL_RATE_WINDOW_SECONDS,
    },
    auth: {
      max: parsed.data.AUTH_RATE_LIMIT,
      windowSeconds: parsed.data.AUTH_RATE_WINDOW_SECONDS,
    },
    payment: {
      max: parsed.data.PAYMENT_RATE_LIMIT,
      windowSeconds: parsed.data.PAYMENT_RATE_WINDOW_SECONDS,
    },
  },

  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
  maxRequestSize: parsed.data.MAX_REQUEST_SIZE,

  logLevel: parsed.data.LOG_LEVEL,
  logDir: parsed.data.LOG_DIR,
} as const;
