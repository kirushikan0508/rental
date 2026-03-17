/**
 * @file gateway/src/config/index.ts
 * @description Gateway configuration — service URLs, rate limit settings, CORS origins.
 */

import dotenv from 'dotenv';

dotenv.config();

/** Microservice endpoint map used by the proxy layer */
export const SERVICE_URLS: Record<string, string> = {
  auth:         process.env.AUTH_SERVICE_URL         || 'http://localhost:3001',
  vehicle:      process.env.VEHICLE_SERVICE_URL      || 'http://localhost:3002',
  booking:      process.env.BOOKING_SERVICE_URL      || 'http://localhost:3003',
  payment:      process.env.PAYMENT_SERVICE_URL      || 'http://localhost:3004',
  tracking:     process.env.TRACKING_SERVICE_URL     || 'http://localhost:3005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  chat:         process.env.CHAT_SERVICE_URL         || 'http://localhost:3007',
  ai:           process.env.AI_SERVICE_URL           || 'http://localhost:3008',
  admin:        process.env.ADMIN_SERVICE_URL        || 'http://localhost:3009',
};

/** Global rate limit configuration */
export const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,   // 1 minute
  maxRequests: 100,       // per window
} as const;

/** CORS allowed origins */
export const CORS_ORIGINS: string[] = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
