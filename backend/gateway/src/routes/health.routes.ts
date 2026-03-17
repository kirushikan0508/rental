/**
 * @file routes/health.routes.ts
 * @description Health check endpoints for the API Gateway and all downstream services.
 *
 * GET /health        → Gateway health
 * GET /health/all    → Health status of all microservices
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { services } from '../config/services.config';
import { getRedisClient } from '../utils/redis.util';
import { logger } from '../utils/logger';

const router = Router();

// ─── Types ──────────────────────────────────────────────────

interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  responseTime?: number;
  error?: string;
}

// ─── GET /health ────────────────────────────────────────────

/**
 * Gateway health check.
 * Returns gateway status and Redis connectivity.
 */
router.get('/', async (_req: Request, res: Response) => {
  let redisStatus = 'unhealthy';

  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    redisStatus = pong === 'PONG' ? 'healthy' : 'unhealthy';
  } catch {
    redisStatus = 'unreachable';
  }

  const isHealthy = redisStatus === 'healthy';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    service: 'api-gateway',
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      redis: redisStatus,
    },
  });
});

// ─── GET /health/all ────────────────────────────────────────

/**
 * Comprehensive health check — pings all downstream services
 * and returns their individual statuses.
 *
 * Timeout: 5 seconds per service (requests run in parallel).
 */
router.get('/all', async (_req: Request, res: Response) => {
  const healthChecks = await Promise.all(
    services.map(async (service): Promise<ServiceHealth> => {
      const startTime = Date.now();
      try {
        const response = await axios.get(`${service.url}/health`, {
          timeout: 5000,
        });

        return {
          name: service.name,
          url: service.url,
          status: response.status === 200 ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        const isTimeout = axios.isAxiosError(error) && error.code === 'ECONNABORTED';
        const errorMessage = axios.isAxiosError(error)
          ? error.message
          : 'Unknown error';

        logger.warn(`Health check failed for ${service.name}: ${errorMessage}`);

        return {
          name: service.name,
          url: service.url,
          status: 'unreachable',
          responseTime: Date.now() - startTime,
          error: isTimeout ? 'Connection timeout' : errorMessage,
        };
      }
    }),
  );

  // Determine overall status
  const healthyCount = healthChecks.filter((h) => h.status === 'healthy').length;
  const totalCount = healthChecks.length;
  const overallStatus =
    healthyCount === totalCount
      ? 'healthy'
      : healthyCount > 0
        ? 'degraded'
        : 'unhealthy';

  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    success: overallStatus !== 'unhealthy',
    service: 'api-gateway',
    status: overallStatus,
    timestamp: new Date().toISOString(),
    summary: `${healthyCount}/${totalCount} services healthy`,
    services: healthChecks,
  });
});

export default router;
