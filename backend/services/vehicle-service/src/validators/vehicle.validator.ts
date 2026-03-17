/**
 * @file validators/vehicle.validator.ts
 * @description Zod validation schemas for vehicle endpoints.
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────

const vehicleTypeEnum = z.enum(['CAR', 'BIKE', 'SCOOTER', 'VAN', 'SUV', 'TRUCK']);
const fuelTypeEnum = z.enum(['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID']);
const transmissionEnum = z.enum(['MANUAL', 'AUTOMATIC']);
const documentTypeEnum = z.enum(['RC_BOOK', 'INSURANCE', 'POLLUTION_CERTIFICATE']);

// ─── Create Vehicle ─────────────────────────────────────────

export const createVehicleSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200).trim(),
  description: z.string().max(5000).optional(),
  type: vehicleTypeEnum,
  brand: z.string().min(1).max(50).trim(),
  model: z.string().min(1).max(50).trim(),
  year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1).max(30).trim(),
  licensePlate: z.string().min(3).max(20).trim().toUpperCase(),
  fuelType: fuelTypeEnum,
  transmission: transmissionEnum,
  seats: z.coerce.number().int().min(1).max(50).optional().default(4),
  engineCapacity: z.string().max(20).optional(),
  mileage: z.coerce.number().positive().optional(),
  hourlyRate: z.coerce.number().positive('Hourly rate must be positive'),
  dailyRate: z.coerce.number().positive('Daily rate must be positive'),
  weeklyRate: z.coerce.number().positive().optional(),
  monthlyRate: z.coerce.number().positive().optional(),
  securityDeposit: z.coerce.number().min(0).optional().default(0),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().min(5).max(500).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().max(100).optional(),
  features: z.array(z.string()).optional().default([]),
});

// ─── Update Vehicle ─────────────────────────────────────────

export const updateVehicleSchema = createVehicleSchema.partial();

// ─── Availability ───────────────────────────────────────────

export const setAvailabilitySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isBlocked: z.boolean(),
  reason: z.string().max(200).optional(),
  customPrice: z.coerce.number().positive().optional(),
}).refine((d) => d.endDate >= d.startDate, { message: 'endDate must be >= startDate' });

export const checkAvailabilitySchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
});

export const blockDatesSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  bookingId: z.string().uuid(),
});

// ─── Document Upload ────────────────────────────────────────

export const uploadDocumentSchema = z.object({
  type: documentTypeEnum,
  expiryDate: z.coerce.date().optional(),
});

// ─── Search ─────────────────────────────────────────────────

export const searchQuerySchema = z.object({
  query: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().optional(),
  type: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  availableOnly: z.coerce.boolean().optional(),
  evOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(['price', 'rating', 'distance', 'newest']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// ─── Admin ──────────────────────────────────────────────────

export const adminActionSchema = z.object({
  note: z.string().min(1, 'Note is required').max(1000),
});

export const adminListSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  flagged: z.coerce.boolean().optional(),
  type: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// ─── Type Exports ───────────────────────────────────────────

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
