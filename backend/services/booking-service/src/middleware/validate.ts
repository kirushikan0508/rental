/**
 * @file middleware/validate.ts
 * @description Zod body validation.
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
        res.status(422).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Input validation failed', details: error.flatten().fieldErrors },
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
       if (error instanceof ZodError) {
        res.status(422).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Query validation failed', details: error.flatten().fieldErrors },
        });
        return;
      }
      next(error);
    }
  }
}
