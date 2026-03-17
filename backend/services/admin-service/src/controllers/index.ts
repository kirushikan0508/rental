/**
 * @file  admin.Groups[2].Value.ToUpper() dminController
 * @description Request handlers for the Admin dashboard & operations service.
 */

import { Request, Response, NextFunction } from 'express';

/** Health controller â€” returns service status */
export const healthCheck = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json({ status: 'ok', service: 'admin-service' });
};
