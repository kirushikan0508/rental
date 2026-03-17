/**
 * @file index.ts
 * @description Entry point for the Push, email, SMS notification service.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import { connectDB } from '../../../shared/utils/db';
import { createServer } from 'http';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// â”€â”€â”€ Health Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

// â”€â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import notificationRoutes from './routes/notification.routes';
import { startNotificationWorker } from './queues/notification.queue';

app.use('/api/v1/notifications', notificationRoutes);

// â”€â”€â”€ Start Server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const startServer = async (): Promise<void> => {
  await connectDB();
  
  // Start the background worker for processing the queue
  startNotificationWorker();

  app.listen(PORT, () => {
    console.log(`ðŸš€ notification-service running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('âŒ Failed to start notification-service:', err);
  process.exit(1);
});

export default app;
