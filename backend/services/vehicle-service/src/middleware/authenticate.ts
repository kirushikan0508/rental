/**
 * @file middleware/authenticate.ts
 * @description JWT authentication middleware — verifies Bearer token
 * and attaches decoded user to req.user.
 *
 * In a gateway-proxied setup the gateway does the verification
 * and passes X-User-* headers. This middleware supports both modes.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Mode 1: Gateway forwarded headers
  const gatewayUserId = req.headers['x-user-id'] as string;
  if (gatewayUserId) {
    req.user = {
      userId: gatewayUserId,
      email: (req.headers['x-user-email'] as string) || '',
      role: (req.headers['x-user-role'] as string) || 'RENTER',
      iat: 0, exp: 0,
    };
    return next();
  }

  // Mode 2: Direct JWT verification
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing access token' } });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, config.jwt.accessSecret) as DecodedToken;
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}
