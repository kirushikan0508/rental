/**
 * @file validators/auth.validator.ts
 * @description Zod validation schemas for all authentication endpoints.
 * Each schema transforms inputs (lowercase email, trim strings) and
 * provides user-friendly error messages.
 */

import { z } from 'zod';

// ─── Shared Rules ───────────────────────────────────────────

/** Password must be 8–128 chars, with uppercase, lowercase, digit, and special char */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const emailSchema = z
  .string()
  .email('Invalid email address')
  .transform((v) => v.toLowerCase().trim());

const phoneSchema = z
  .string()
  .min(8, 'Phone number must be at least 8 characters')
  .max(20, 'Phone number must be at most 20 characters')
  .regex(/^\+?[\d\s-]+$/, 'Invalid phone number format');

// ─── Register ───────────────────────────────────────────────

/** Validation schema for email + password registration */
export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters')
    .trim(),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(['RENTER', 'OWNER']).optional().default('RENTER'),
});

// ─── Login ──────────────────────────────────────────────────

/** Validation schema for email + password login */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/** Validation schema for Google OAuth login */
export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

// ─── OTP ────────────────────────────────────────────────────

/** Validation schema for requesting an OTP */
export const requestOtpSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone number is required')
    .transform((v) => v.trim()),
});

/** Validation schema for verifying an OTP */
export const verifyOtpSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone number is required')
    .transform((v) => v.trim()),
  code: z
    .string()
    .length(6, 'OTP code must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP code must contain only digits'),
});

// ─── Token Refresh ──────────────────────────────────────────

/** Validation schema for token refresh */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─── Type Exports ───────────────────────────────────────────
// Infer TypeScript types from Zod schemas for type-safe controller usage

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
