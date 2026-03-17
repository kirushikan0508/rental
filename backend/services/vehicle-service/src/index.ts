/**
 * @file index.ts
 * @description Vehicle Service entry point.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { getRedisClient, disconnectRedis } from './utils/redis.util';
import { ensureIndex } from './utils/elasticsearch.util';
import { disconnectPrisma } from './services/vehicle.service';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler';
import vehicleRoutes from './routes/vehicle.routes';

const app = express();

// ─── Security ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.disable('x-powered-by');

// ─── Body Parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Logging ────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.http(msg.trim()) },
  skip: (_req, res) => config.isProduction && res.statusCode < 400,
}));

app.set('trust proxy', 1);

// ─── Routes ─────────────────────────────────────────────────
app.use('/vehicles', vehicleRoutes);

app.get('/', (_req, res) => {
  res.json({ service: 'vehicle-service', version: '1.0.0', status: 'running', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Startup ────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    // Redis
    const redis = getRedisClient();
    await redis.ping();
    logger.info('✅ Redis connected');

    // Elasticsearch — ensure index exists
    await ensureIndex();

    // HTTP Server
    const server = app.listen(config.port, () => {
      logger.info(`🚗 Vehicle Service running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Health: http://localhost:${config.port}/vehicles/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`\n📡 Received ${signal}. Shutting down...`);
      server.close(async () => {
        await disconnectRedis();
        await disconnectPrisma();
        logger.info('👋 Vehicle Service shutdown complete');
        process.exit(0);
      });
      setTimeout(() => { logger.error('⚠️  Forced shutdown'); process.exit(1); }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('❌ Failed to start Vehicle Service:', error);
    process.exit(1);
  }
}

start();
export default app;
