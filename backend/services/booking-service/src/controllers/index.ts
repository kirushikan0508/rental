/**
 * @file  booking.Groups[2].Value.ToUpper() ookingController
 * @description Request handlers for the Booking lifecycle management service.
 */

import { Request, Response, NextFunction } from 'express';

/** Health controller â€” returns service status */
export const healthCheck = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json({ status: 'ok', service: 'booking-service' });
};
