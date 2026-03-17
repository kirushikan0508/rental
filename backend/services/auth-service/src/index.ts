/**
 * @file index.ts
 * @description Auth Service entry point.
 *
 * Initializes Express with security middleware, mounts auth routes,
 * connects to Redis, and starts the HTTP server with graceful shutdown.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, disconnectRedis } from './utils/redis.util';
import { disconnectPrisma } from './services/auth.service';
import { sanitizeInput } from './middleware/sanitize';
import { authRoutes } from './routes';

// ─── Express App ────────────────────────────────────────────

const app = express();

// ─── Security Middleware ────────────────────────────────────

/** Helmet — sets secure HTTP headers (CSP, HSTS, X-Frame, etc.) */
app.use(helmet());

/** CORS — restrict to allowed origins */
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsing ───────────────────────────────────────────

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Input Sanitization ────────────────────────────────────

app.use(sanitizeInput);

// ─── Request Logging ───────────────────────────────────────

app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
  skip: (_req, res) => config.isProduction && res.statusCode < 400,
}));

// ─── Trust Proxy (for accurate IP in rate limiter) ──────────

app.set('trust proxy', 1);

// ─── Routes ─────────────────────────────────────────────────

/** Mount auth routes at /auth prefix */
app.use('/auth', authRoutes);

/** Root health check */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'auth-service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ─── Global Error Handler ───────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);

  const statusCode = 500;
  const message = config.isProduction
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(config.isProduction ? {} : { stack: err.stack }),
    },
  });
});

// ─── Server Startup ─────────────────────────────────────────

async function start(): Promise<void> {
  try {
    // Connect to Redis
    const redis = getRedisClient();
    await redis.ping();
    logger.info('✅ Redis connection verified');

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Auth Service running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Health: http://localhost:${config.port}/auth/health`);
    });

    // ─── Graceful Shutdown ────────────────────────────────
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`\n📡 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('🔌 HTTP server closed');
        await disconnectRedis();
        await disconnectPrisma();
        logger.info('👋 Auth Service shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('❌ Failed to start Auth Service:', error);
    process.exit(1);
  }
}

start();

export default app;
