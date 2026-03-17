/**
 * @file  chat.Groups[2].Value.ToUpper() hatController
 * @description Request handlers for the Real-time messaging service.
 */

import { Request, Response, NextFunction } from 'express';

/** Health controller â€” returns service status */
export const healthCheck = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json({ status: 'ok', service: 'chat-service' });
};
