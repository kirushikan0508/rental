/**
 * @file index.ts
 * @description Entry point for the API Gateway.
 * Routes incoming requests to appropriate microservices,
 * handles rate limiting, authentication, and request logging.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// ─── Service Proxy Routes ───────────────────────────────────
// TODO: Mount proxy routes from ./routes
// app.use('/api/v1/auth',          authProxy);
// app.use('/api/v1/vehicles',      vehicleProxy);
// app.use('/api/v1/bookings',      bookingProxy);
// app.use('/api/v1/payments',      paymentProxy);
// app.use('/api/v1/tracking',      trackingProxy);
// app.use('/api/v1/notifications', notificationProxy);
// app.use('/api/v1/chat',          chatProxy);
// app.use('/api/v1/ai',            aiProxy);
// app.use('/api/v1/admin',         adminProxy);

// ─── 404 Handler ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});

export default app;
