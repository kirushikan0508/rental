/**
 * @file middleware/sanitize.ts
 * @description Input sanitization middleware to prevent XSS attacks.
 * Strips HTML tags and dangerous characters from request body, query, and params.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitizes all string values in an object.
 * Strips HTML tags and trims whitespace.
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/<[^>]*>/g, '')           // Strip HTML tags
      .replace(/javascript:/gi, '')       // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '')         // Remove event handlers (onclick=, etc.)
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * to prevent XSS and script injection attacks.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query) as Record<string, string>;
  }
  if (req.params) {
    req.params = sanitizeValue(req.params) as Record<string, string>;
  }
  next();
}
