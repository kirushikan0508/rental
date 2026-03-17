/**
 * @file routes/proxy.routes.ts
 * @description Configures http-proxy-middleware to route requests
 * to the correct downstream microservice.
 *
 * For each service in the registry, creates a proxy that:
 *   1. Strips the gateway prefix (e.g. /api/auth → /)
 *   2. Forwards the request to the service URL
 *   3. Passes X-User-*, X-Request-Id headers to the service
 *   4. Handles proxy errors gracefully
 */

import { Router, Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { services, ServiceConfig } from '../config/services.config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Builds proxy options for a given service.
 *
 * @param service - Service configuration from the registry
 * @returns http-proxy-middleware Options
 */
function buildProxyOptions(service: ServiceConfig): Options {
  return {
    target: service.url,

    // Rewrite path: strip the gateway prefix
    // e.g. /api/auth/login → /auth/login
    pathRewrite: {
      [`^${service.prefix}`]: '',
    },

    // Required for proxying to different hosts
    changeOrigin: true,

    // Timeouts
    proxyTimeout: 30000,  // 30 seconds
    timeout: 30000,

    // ─── Event Handlers ──────────────────────────────────

    on: {
      /**
       * Fired before the proxied request is sent.
       * Passes the request ID for distributed tracing.
       */
      proxyReq: (proxyReq, req) => {
        const incomingReq = req as Request;
        const requestId = incomingReq.headers['x-request-id'];
        if (requestId) {
          proxyReq.setHeader('X-Request-Id', requestId as string);
        }

        // Forward body for POST/PUT/PATCH with JSON
        // (http-proxy-middleware handles this, but manual fix for body-parser edge case)
        if (incomingReq.body && ['POST', 'PUT', 'PATCH'].includes(incomingReq.method)) {
          const bodyData = JSON.stringify(incomingReq.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },

      /**
       * Fired when the downstream service responds.
       * Removes sensitive headers from the response.
       */
      proxyRes: (proxyRes, req) => {
        const incomingReq = req as Request;
        // Remove headers that leak internal info
        delete proxyRes.headers['x-powered-by'];

        logger.debug(
          `Proxy response: ${incomingReq.method} ${incomingReq.originalUrl} → ${service.name} [${proxyRes.statusCode}]`,
        );
      },

      /**
       * Fired on proxy connection error.
       */
      error: (err, req, res) => {
        const incomingReq = req as Request;
        logger.error(`Proxy error → ${service.name}: ${err.message}`, {
          service: service.name,
          method: incomingReq.method,
          path: incomingReq.originalUrl,
          error: err.message,
        });

        // Return a gateway error response
        const response = res as Response;
        if (!response.headersSent) {
          response.status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `${service.name} is currently unavailable. Please try again later.`,
            },
          });
        }
      },
    },
  };
}

// ─── Register Proxy Routes ──────────────────────────────────

for (const service of services) {
  const proxyOptions = buildProxyOptions(service);

  logger.info(`📡 Proxy: ${service.prefix}/* → ${service.url} (${service.name})`);

  router.use(service.prefix, createProxyMiddleware(proxyOptions));
}

export default router;
