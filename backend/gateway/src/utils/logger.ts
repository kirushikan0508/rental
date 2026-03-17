/**
 * @file utils/logger.ts
 * @description Winston structured logger with console + file transports.
 *
 * - Console: colorized dev output / JSON in production
 * - Files: combined.log + error.log (rotated by OS or external tool)
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Ensure log directory exists
const logDir = path.resolve(config.logDir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/** Dev console format: "HH:mm:ss INFO: message" */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    `${ts} ${level}: ${stack || message}`,
  ),
);

/** Production JSON format for log aggregation */
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.isProduction ? prodFormat : devFormat,
  defaultMeta: { service: 'api-gateway' },
  transports: [
    // Console transport (always)
    new winston.transports.Console(),

    // File transports — combined + error-only
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
