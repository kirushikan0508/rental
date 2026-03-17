/**
 * @file  notification.Groups[2].Value.ToUpper() otificationController
 * @description Request handlers for the Push, email, SMS notification service.
 */

import { Request, Response, NextFunction } from 'express';

/** Health controller â€” returns service status */
export const healthCheck = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json({ status: 'ok', service: 'notification-service' });
};
