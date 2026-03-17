/**
 * @file services/availability.service.ts
 * @description Vehicle availability calendar — set, check, and block dates.
 */

import { Availability } from '@prisma/client';
import { prisma } from './vehicle.service';
import { logger } from '../utils/logger';

// ─── Custom Error ───────────────────────────────────────────

export class AvailabilityError extends Error {
  constructor(public message: string, public statusCode: number, public code: string) {
    super(message);
    this.name = 'AvailabilityError';
  }
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Generates an array of Date objects between start and end (inclusive).
 */
function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// ═══════════════════════════════════════════════════════════
// SET AVAILABILITY
// ═══════════════════════════════════════════════════════════

interface SetAvailabilityInput {
  vehicleId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  isBlocked: boolean;
  reason?: string;
  customPrice?: number;
}

/**
 * Sets availability for a date range. Creates or updates records.
 * Only the vehicle owner can modify availability.
 *
 * @returns Array of upserted availability records
 */
export async function setAvailability(input: SetAvailabilityInput): Promise<Availability[]> {
  // Verify ownership
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new AvailabilityError('Vehicle not found', 404, 'NOT_FOUND');
  if (vehicle.ownerId !== input.ownerId) {
    throw new AvailabilityError('Not authorised', 403, 'FORBIDDEN');
  }

  const dates = getDateRange(input.startDate, input.endDate);

  // Upsert each date in a transaction
  const results = await prisma.$transaction(
    dates.map((date) =>
      prisma.availability.upsert({
        where: {
          vehicleId_date: { vehicleId: input.vehicleId, date },
        },
        create: {
          vehicleId: input.vehicleId,
          date,
          isBlocked: input.isBlocked,
          reason: input.reason,
          customPrice: input.customPrice,
        },
        update: {
          isBlocked: input.isBlocked,
          reason: input.reason,
          customPrice: input.customPrice,
        },
      }),
    ),
  );

  logger.info(`📅 Availability set for ${input.vehicleId}: ${dates.length} dates (blocked: ${input.isBlocked})`);
  return results;
}

// ═══════════════════════════════════════════════════════════
// CHECK AVAILABILITY
// ═══════════════════════════════════════════════════════════

/**
 * Checks whether a vehicle is available for the given date range.
 *
 * @returns Object with `available` boolean and array of blocked dates
 */
export async function checkAvailability(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ available: boolean; blockedDates: Date[] }> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new AvailabilityError('Vehicle not found', 404, 'NOT_FOUND');
  if (!vehicle.isAvailable || vehicle.status !== 'APPROVED') {
    return { available: false, blockedDates: [] };
  }

  const blockedRecords = await prisma.availability.findMany({
    where: {
      vehicleId,
      date: { gte: startDate, lte: endDate },
      isBlocked: true,
    },
    select: { date: true },
  });

  return {
    available: blockedRecords.length === 0,
    blockedDates: blockedRecords.map((r) => r.date),
  };
}

// ═══════════════════════════════════════════════════════════
// BLOCK DATES (for confirmed bookings)
// ═══════════════════════════════════════════════════════════

/**
 * Blocks dates for a confirmed booking.
 * Called by the booking-service via internal API.
 */
export async function blockDatesForBooking(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  bookingId: string,
): Promise<void> {
  const dates = getDateRange(startDate, endDate);

  await prisma.$transaction(
    dates.map((date) =>
      prisma.availability.upsert({
        where: { vehicleId_date: { vehicleId, date } },
        create: { vehicleId, date, isBlocked: true, reason: `Booking: ${bookingId}` },
        update: { isBlocked: true, reason: `Booking: ${bookingId}` },
      }),
    ),
  );

  logger.info(`🔒 Dates blocked for booking ${bookingId}: ${dates.length} days`);
}

/**
 * Unblocks dates when a booking is cancelled.
 */
export async function unblockDatesForBooking(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> {
  await prisma.availability.updateMany({
    where: {
      vehicleId,
      date: { gte: startDate, lte: endDate },
      isBlocked: true,
    },
    data: { isBlocked: false, reason: null },
  });

  logger.info(`🔓 Dates unblocked for vehicle ${vehicleId}`);
}

// ═══════════════════════════════════════════════════════════
// GET CALENDAR
// ═══════════════════════════════════════════════════════════

/**
 * Returns the full availability calendar for a vehicle within a date range.
 */
export async function getCalendar(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
): Promise<Availability[]> {
  return prisma.availability.findMany({
    where: {
      vehicleId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });
}
