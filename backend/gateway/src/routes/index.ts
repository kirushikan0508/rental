/**
 * @file gateway/src/routes/index.ts
 * @description Gateway route definitions — proxy mappings to downstream services.
 */

import { Router } from 'express';

const router = Router();

// TODO: Configure http-proxy-middleware for each service
// import { createProxyMiddleware } from 'http-proxy-middleware';
// import { SERVICE_URLS } from '../config';

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

export default router;
