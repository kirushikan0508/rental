/**
 * @file middleware/authorize.ts
 * @description Role-based access control middleware.
 * Must be used AFTER the `authenticate` middleware.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Creates a middleware that restricts access to users with specified roles.
 *
 * @param allowedRoles - One or more roles that can access the route
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/users', authenticate, authorize('ADMIN', 'SUPPORT'), controller);
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Ensure authenticate ran first
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}
