import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  id: string;
  role: string;
}

// Extend Express Request object to include user
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
