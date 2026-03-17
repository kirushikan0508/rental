/**
 * @file middleware/validate.ts
 * @description Generic Zod validation middleware for request body,
 * query parameters, and route parameters.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Creates a middleware that validates `req.body` against a Zod schema.
 * Returns 422 Unprocessable Entity with field-level errors on failure.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * router.post('/register', validate(registerSchema), registerController);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and replace body with validated + transformed data
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const field = issue.path.join('.');
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(issue.message);
        }

        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: fieldErrors,
          },
        });
        return;
      }

      next(error);
    }
  };
}

/**
 * Creates a middleware that validates `req.query` against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameter validation failed',
            details: error.flatten().fieldErrors,
          },
        });
        return;
      }
      next(error);
    }
  };
}
