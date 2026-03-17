/**
 * @file config/index.ts
 * @description Zod-validated environment config for payment-service.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3005),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // PayHere
  PAYHERE_MERCHANT_ID: z.string(),
  PAYHERE_SECRET: z.string(),

  // Financial Config
  DEFAULT_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(20),
  CURRENCY: z.string().length(3).toLowerCase().default('usd'),

  // Subscription Plan IDs
  PLAN_BASIC_ID: z.string().optional(),
  PLAN_PRO_ID: z.string(),
  PLAN_PREMIUM_ID: z.string(),

  // Email config
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.coerce.number(),
  EMAIL_USER: z.string(),
  EMAIL_PASS: z.string(),
  EMAIL_FROM: z.string().email(),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid payment-service configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwt: { accessSecret: parsed.data.JWT_ACCESS_SECRET },
  
  stripe: {
    secretKey: parsed.data.STRIPE_SECRET_KEY,
    webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
  },

  payhere: {
    merchantId: parsed.data.PAYHERE_MERCHANT_ID,
    secret: parsed.data.PAYHERE_SECRET,
  },

  finance: {
    defaultCommission: parsed.data.DEFAULT_COMMISSION_PERCENT,
    currency: parsed.data.CURRENCY,
  },

  plans: {
    pro: parsed.data.PLAN_PRO_ID,
    premium: parsed.data.PLAN_PREMIUM_ID,
  },

  email: {
    host: parsed.data.EMAIL_HOST,
    port: parsed.data.EMAIL_PORT,
    user: parsed.data.EMAIL_USER,
    pass: parsed.data.EMAIL_PASS,
    from: parsed.data.EMAIL_FROM,
  },

  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
  logLevel: parsed.data.LOG_LEVEL,
} as const;
