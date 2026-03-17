/**
 * @file index.ts
 * @description API Gateway entry point.
 *
 * Boots the Express server with the following middleware pipeline:
 *   1. Helmet (security headers)
 *   2. CORS (origin whitelist)
 *   3. Request size limiting
 *   4. Request logger (X-Request-Id, timing)
 *   5. JWT authentication (service-aware)
 *   6. Rate limiter (Redis, tiered)
 *   7. Health check routes
 *   8. Proxy routes → microservices
 *   9. 404 handler
 *  10. Global error handler
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, disconnectRedis } from './utils/redis.util';
import {
  authMiddleware,
  rateLimitMiddleware,
  requestLoggerMiddleware,
  globalErrorHandler,
  notFoundHandler,
} from './middleware';
import { proxyRoutes, healthRoutes } from './routes';

// ─── Express App ────────────────────────────────────────────

const app = express();

// ─── 1. Security Headers ───────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false,        // Let downstream services set their own
  crossOriginEmbedderPolicy: false,    // Allow cross-origin resources
}));

// Remove X-Powered-By header
app.disable('x-powered-by');

// ─── 2. CORS ────────────────────────────────────────────────

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// ─── 3. Request Size Limiting ───────────────────────────────

app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

// ─── 4. Trust Proxy (for accurate client IP) ───────────────

app.set('trust proxy', 1);

// ─── 5. Request Logger ─────────────────────────────────────

app.use(requestLoggerMiddleware);

// ─── 6. JWT Authentication ─────────────────────────────────

app.use(authMiddleware);

// ─── 7. Rate Limiter ───────────────────────────────────────

app.use(rateLimitMiddleware);

// ─── 8. Health Check Routes ────────────────────────────────
// (mounted before proxy to avoid being forwarded)

app.use('/health', healthRoutes);

// ─── 9. Gateway Info ────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    service: 'api-gateway',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      healthAll: '/health/all',
      auth: '/api/auth/*',
      users: '/api/users/*',
      vehicles: '/api/vehicles/*',
      bookings: '/api/bookings/*',
      payments: '/api/payments/*',
      tracking: '/api/tracking/*',
      chat: '/api/chat/*',
      admin: '/api/admin/*',
      ai: '/api/ai/*',
    },
  });
});

// ─── 10. Proxy Routes → Microservices ───────────────────────

app.use(proxyRoutes);

// ─── 11. 404 Handler ────────────────────────────────────────

app.use(notFoundHandler);

// ─── 12. Global Error Handler ───────────────────────────────

app.use(globalErrorHandler);

// ─── Server Startup ─────────────────────────────────────────

async function start(): Promise<void> {
  try {
    // Verify Redis connection
    const redis = getRedisClient();
    await redis.ping();
    logger.info('✅ Redis connection verified');

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 API Gateway running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Health:  http://localhost:${config.port}/health`);
      logger.info(`   Services: http://localhost:${config.port}/health/all`);
    });

    // ─── Graceful Shutdown ──────────────────────────────

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`\n📡 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('🔌 HTTP server closed');
        await disconnectRedis();
        logger.info('👋 API Gateway shutdown complete');
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
    logger.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

start();

export default app;
