/**
 * @file index.ts
 * @description Payment service entry point. Connects to PostgreSQL via Prisma, Redis, and initializes Express.
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, disconnectRedis } from './utils/redis.util';
import paymentRoutes from './routes/payment.routes';
import { errorHandler } from './middleware';

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// ─── Security & Config ──────────────────────────────────────

// Note: webhook route must be mounted BEFORE any body parsers
// to allow raw body for signature verification.
// Webhook route is already configured with express.raw inside paymentRoutes.

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.disable('x-powered-by');

// ─── Logging ────────────────────────────────────────────────

app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.http(msg.trim()) },
  skip: (_req, res) => config.isProduction && res.statusCode < 400,
}));

// ─── Routes ─────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    service: 'payment-service',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPing = await getRedisClient().ping();
    res.json({
      success: true,
      service: 'payment-service',
      db: 'connected',
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
    });
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(503).json({ success: false, error: 'Health check failed' });
  }
});

app.use('/payments', paymentRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

// ─── Startup ────────────────────────────────────────────────

async function start() {
  try {
    logger.info('Starting Payment Service...');
    
    // 1. Check DB Connection
    await prisma.$connect();
    logger.info('🟢 PostgreSQL connected (Prisma)');

    // 2. Check Redis Connection
    getRedisClient();

    // 3. Start HTTP Server
    httpServer.listen(config.port, () => {
      logger.info(`💳 Payment Service running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
    });

    // 4. Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\n📡 Received ${signal}. Shutting down...`);
      httpServer.close(async () => {
        logger.info('HTTP server closed');
        await prisma.$disconnect();
        await disconnectRedis();
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('❌ Failed to start Payment Service:', error);
    process.exit(1);
  }
}

start();
export default app;
