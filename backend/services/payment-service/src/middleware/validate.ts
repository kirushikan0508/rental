/**
 * @file middleware/validate.ts
 * @description Body and Query validation using Zod.
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
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.flatten().fieldErrors },
        });
        return;
      }
      next(error);
    }
  };
}
