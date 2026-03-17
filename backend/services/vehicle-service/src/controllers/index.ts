/**
 * @file  vehicle.Groups[2].Value.ToUpper() ehicleController
 * @description Request handlers for the Vehicle listing & management service.
 */

import { Request, Response, NextFunction } from 'express';

/** Health controller â€” returns service status */
export const healthCheck = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json({ status: 'ok', service: 'vehicle-service' });
};
