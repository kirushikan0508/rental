/**
 * @file index.ts
 * @description Application entry point. Sets up Express, Socket.io, Mongoose, and Redis.
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { logger } from './utils/logger';
import { connectDB, disconnectDB } from './utils/db';
import { getRedisClient, disconnectRedis } from './utils/redis.util';
import { initSocketInteractions } from './socket';
import { errorHandler } from './middleware';
import bookingRoutes from './routes/booking.routes';

const app = express();
const httpServer = createServer(app);

// ─── Security & Config ──────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.disable('x-powered-by');

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Logging ────────────────────────────────────────────────

app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.http(msg.trim()) },
  skip: (_req, res) => config.isProduction && res.statusCode < 400,
}));

app.set('trust proxy', 1);

// ─── Routes ─────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    service: 'booking-service',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (_req, res) => {
  try {
    const redisPing = await getRedisClient().ping();
    res.json({
      success: true,
      service: 'booking-service',
      redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
    });
  } catch (error) {
    res.status(503).json({ success: false, error: 'Health check failed' });
  }
});

app.use('/bookings', bookingRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

// ─── Startup ────────────────────────────────────────────────

async function start() {
  try {
    logger.info('Starting Booking Service...');
    
    // 1. Connect MongoDB
    await connectDB();
    
    // 2. Connect Redis
    getRedisClient();

    // 3. Initialize Socket.io
    initSocketInteractions(httpServer);
    logger.info('🔌 Socket.io initialized');

    // 4. Start HTTP Server
    httpServer.listen(config.port, () => {
      logger.info(`📅 Booking Service running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
    });

    // 5. Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\n📡 Received ${signal}. Shutting down...`);
      httpServer.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
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
    logger.error('❌ Failed to start Booking Service:', error);
    process.exit(1);
  }
}

start();
export default app;
