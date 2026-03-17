/**
 * @file utils/logger.ts
 * @description Winston structured logger for booking-service.
 */

import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => `${ts} ${level}: ${stack || message}`),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'booking-service' },
  transports: [new winston.transports.Console()],
});
