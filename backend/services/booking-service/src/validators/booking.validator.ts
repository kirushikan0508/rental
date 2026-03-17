/**
 * @file validators/booking.validator.ts
 * @description Zod schemas for booking features.
 */

import { z } from 'zod';

export const createBookingSchema = z.object({
  ownerId: z.string().uuid().or(z.string().min(1)),
  vehicleId: z.string().uuid().or(z.string().min(1)),
  vehicleTitle: z.string().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  pricingType: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']),
  baseRate: z.number().positive(),
  hasInsurance: z.boolean().optional(),
  insuranceType: z.string().optional(),
  insuranceFee: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  pointsToRedeem: z.number().int().min(0).optional(),
  isCorporate: z.boolean().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  renterNotes: z.string().max(1000).optional(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
});

export const updateBookingStatusSchema = z.object({
  action: z.enum(['CONFIRM', 'REJECT', 'START', 'COMPLETE']),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(5).max(1000),
});

export const raiseDisputeSchema = z.object({
  vehicleId: z.string(),
  description: z.string().min(10).max(2000),
  evidence: z.array(z.object({
    url: z.string().url(),
    description: z.string().optional()
  })).min(1, 'At least one photo is required'),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(['RESOLVED_RENTER', 'RESOLVED_OWNER', 'CLOSED']),
  resolution: z.string().min(5).max(2000),
  compensationAmount: z.number().min(0).optional(),
});
