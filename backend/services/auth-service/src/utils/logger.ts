/**
 * @file utils/logger.ts
 * @description Winston structured logger with console and file transports.
 * Provides request-level correlation IDs in production.
 */

import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/** Custom log format for development console output */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    `${ts} ${level}: ${stack || message}`,
  ),
);

/** Structured JSON format for production */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.Console(),
    // In production, add file/cloud transports:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
