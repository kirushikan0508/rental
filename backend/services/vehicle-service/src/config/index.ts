/**
 * @file config/index.ts
 * @description Centralized environment configuration with Zod validation.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3003),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),

  // AWS S3
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  S3_SIGNED_URL_EXPIRY: z.coerce.number().default(3600),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  ELASTICSEARCH_INDEX: z.string().default('vehicles'),

  // Upload limits
  MAX_IMAGE_SIZE_MB: z.coerce.number().default(5),
  MAX_IMAGES_PER_VEHICLE: z.coerce.number().default(10),
  MAX_DOCUMENT_SIZE_MB: z.coerce.number().default(10),

  // Cache
  VEHICLE_CACHE_TTL: z.coerce.number().default(600),
  SEARCH_CACHE_TTL: z.coerce.number().default(120),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('debug'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid vehicle-service configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  jwt: { accessSecret: parsed.data.JWT_ACCESS_SECRET },

  aws: {
    region: parsed.data.AWS_REGION,
    accessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
    secretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
    s3Bucket: parsed.data.S3_BUCKET_NAME,
    signedUrlExpiry: parsed.data.S3_SIGNED_URL_EXPIRY,
  },

  elasticsearch: {
    url: parsed.data.ELASTICSEARCH_URL,
    index: parsed.data.ELASTICSEARCH_INDEX,
  },

  upload: {
    maxImageSizeBytes: parsed.data.MAX_IMAGE_SIZE_MB * 1024 * 1024,
    maxImagesPerVehicle: parsed.data.MAX_IMAGES_PER_VEHICLE,
    maxDocumentSizeBytes: parsed.data.MAX_DOCUMENT_SIZE_MB * 1024 * 1024,
  },

  cache: {
    vehicleTtl: parsed.data.VEHICLE_CACHE_TTL,
    searchTtl: parsed.data.SEARCH_CACHE_TTL,
  },

  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()),
  logLevel: parsed.data.LOG_LEVEL,
} as const;
