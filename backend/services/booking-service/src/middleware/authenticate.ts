/**
 * @file middleware/authenticate.ts
 * @description JWT auth and gateway headers mapping.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Try Gateway headers first
  const gatewayUserId = req.headers['x-user-id'] as string;
  if (gatewayUserId) {
    req.user = {
      userId: gatewayUserId,
      email: (req.headers['x-user-email'] as string) || '',
      role: (req.headers['x-user-role'] as string) || 'RENTER',
    };
    return next();
  }

  // Fallback to direct JWT verification
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }

  try {
    req.user = jwt.verify(token, config.jwt.accessSecret) as DecodedToken;
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}
