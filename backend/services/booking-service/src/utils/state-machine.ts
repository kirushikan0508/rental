/**
 * @file utils/state-machine.ts
 * @description Validates state transitions for a booking.
 */

import { BookingStatusType, BookingStatus } from '../models';

// Map of allowed transitions FROM a given state TO a new state
const allowedTransitions: Record<BookingStatusType, BookingStatusType[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED, // Owner accepts
    BookingStatus.REJECTED,  // Owner rejects
    BookingStatus.CANCELLED, // Renter cancels before confirmation
    BookingStatus.EXPIRED,   // Automatically expired if not acted upon
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.ACTIVE,    // Rental period starts
    BookingStatus.CANCELLED, // Renter cancels
  ],
  [BookingStatus.ACTIVE]: [
    BookingStatus.COMPLETED, // Rental period ends normally
    BookingStatus.CANCELLED, // Exceptional cancellation mid-rental
  ],
  [BookingStatus.COMPLETED]: [], // Terminal state
  [BookingStatus.CANCELLED]: [], // Terminal state
  [BookingStatus.REJECTED]: [],  // Terminal state
  [BookingStatus.EXPIRED]: [],   // Terminal state
};

/**
 * Checks if a status transition is valid.
 */
export function isValidTransition(currentStatus: BookingStatusType, nextStatus: BookingStatusType): boolean {
  // Admin override might bypass this, but standard logic uses it
  const allowed = allowedTransitions[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}
