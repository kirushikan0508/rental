/**
 * @file middleware/validate.ts
 * @description Zod body/query validation middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const field = issue.path.join('.');
          if (!details[field]) details[field] = [];
          details[field].push(issue.message);
        }
        res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Input validation failed', details } });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Query validation failed', details: error.flatten().fieldErrors } });
        return;
      }
      next(error);
    }
  };
}
