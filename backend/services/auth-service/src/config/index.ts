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
  PORT: z.coerce.number().default(3001),

  // PostgreSQL
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Rental Platform <noreply@rentalplatform.com>'),

  // OTP
  OTP_LENGTH: z.coerce.number().min(4).max(8).default(6),
  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),

  // Rate Limiting
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_LOCKOUT_SECONDS: z.coerce.number().default(900),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

// ─── Parse & Validate ───────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// ─── Export Typed Config ────────────────────────────────────

export const config = {
  /** Current Node environment */
  nodeEnv: parsed.data.NODE_ENV,
  /** Whether running in production */
  isProduction: parsed.data.NODE_ENV === 'production',
  /** Server port */
  port: parsed.data.PORT,

  /** PostgreSQL connection string */
  databaseUrl: parsed.data.DATABASE_URL,

  /** Redis connection URL */
  redisUrl: parsed.data.REDIS_URL,

  jwt: {
    /** Secret for signing access tokens */
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    /** Secret for signing refresh tokens */
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    /** Access token TTL (e.g. "15m") */
    accessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
    /** Refresh token TTL (e.g. "7d") */
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  },

  google: {
    /** Google OAuth 2.0 client ID */
    clientId: parsed.data.GOOGLE_CLIENT_ID,
    /** Google OAuth 2.0 client secret */
    clientSecret: parsed.data.GOOGLE_CLIENT_SECRET,
  },

  smtp: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    from: parsed.data.SMTP_FROM,
  },

  otp: {
    /** Number of digits in the OTP code */
    length: parsed.data.OTP_LENGTH,
    /** OTP time-to-live in seconds */
    expirySeconds: parsed.data.OTP_EXPIRY_SECONDS,
  },

  rateLimit: {
    /** Max failed login attempts before lockout */
    maxLoginAttempts: parsed.data.MAX_LOGIN_ATTEMPTS,
    /** Lockout duration in seconds after max attempts */
    loginLockoutSeconds: parsed.data.LOGIN_LOCKOUT_SECONDS,
  },

  /** Allowed CORS origins as an array */
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),

  /** Winston log level */
  logLevel: parsed.data.LOG_LEVEL,
} as const;
