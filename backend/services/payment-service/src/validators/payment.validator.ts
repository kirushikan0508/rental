/**
 * @file validators/payment.validator.ts
 * @description Zod validation schemas for payment routes.
 */

import { z } from 'zod';

export const createIntentSchema = z.object({
  bookingId: z.string().min(1),
  ownerId: z.string().min(1),
  amount: z.number().int().positive(), // Cents
  currency: z.string().length(3).optional(),
  provider: z.enum(['STRIPE', 'PAYHERE']).optional(),
});

export const refundSchema = z.object({
  bookingId: z.string().min(1),
  amountToRefund: z.number().int().positive(),
  reason: z.string().min(5),
});

export const triggerPayoutSchema = z.object({
  bookingId: z.string().min(1),
});

export const connectAccountSchema = z.object({
  email: z.string().email(),
});

export const subscribeSchema = z.object({
  tier: z.enum(['PRO', 'PREMIUM']),
  email: z.string().email(),
});
