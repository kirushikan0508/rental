/**
 * @file services/booking.service.ts
 * @description Main booking lifecycle logic: create, confirm, cancel, complete.
 */

import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { Booking, BookingStatus, PricingTypeValue } from '../models';
import { calculatePricing } from '../utils/pricing.engine';
import { isValidTransition } from '../utils/state-machine';
import { acquireLock, releaseLock } from '../utils/lock.util';
import { redeemPoints } from './loyalty.service';
import { config } from '../config';

export class BookingError extends Error {
  constructor(public message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'BookingError';
  }
}

// ─── Interfaces ─────────────────────────────────────────────

export interface CreateBookingInput {
  renterId: string;
  ownerId: string;
  vehicleId: string;
  vehicleTitle: string;
  startDate: Date;
  endDate: Date;
  pricingType: PricingTypeValue;
  baseRate: number;
  hasInsurance?: boolean;
  insuranceType?: string;
  insuranceFee?: number;
  securityDeposit?: number;
  pointsToRedeem?: number;
  isCorporate?: boolean;
  companyId?: string;
  companyName?: string;
  renterNotes?: string;
}

// ─── Create ─────────────────────────────────────────────────

export async function createBooking(input: CreateBookingInput) {
  const lockKey = `vehicle:${input.vehicleId}:${input.startDate.toISOString()}-${input.endDate.toISOString()}`;
  const lockValue = await acquireLock(lockKey);

  try {
    // 1. Check existing overlapping bookings
    const overlap = await Booking.findOne({
      vehicleId: input.vehicleId,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
      $or: [
        { startDate: { $lt: input.endDate }, endDate: { $gt: input.startDate } },
      ],
    });

    if (overlap) {
      throw new BookingError('Vehicle is not available for requested dates', 409);
    }

    // 2. Calculate Pricing
    const { subtotal, totalUnits } = calculatePricing(input.startDate, input.endDate, input.pricingType, input.baseRate);
    
    let loyaltyDiscount = 0;
    if (input.pointsToRedeem && input.pointsToRedeem > 0) {
      // Need a placeholder bookingId since it's not created yet, 
      // but redeem logic needs it. Will defer redemption or use generated ID.
      // Easiest is to generate bookingNumber first.
    }

    const bookingNumber = `BKG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    if (input.pointsToRedeem && input.pointsToRedeem > 0) {
      loyaltyDiscount = await redeemPoints(input.renterId, bookingNumber, input.pointsToRedeem);
    }

    let corporateDiscount = 0;
    if (input.isCorporate) {
      corporateDiscount = subtotal * (config.corporate.discountPercent / 100);
    }

    const totalAmount = subtotal + (input.insuranceFee || 0) - loyaltyDiscount - corporateDiscount;

    // 3. Create Record
    const booking = await Booking.create({
      bookingNumber,
      renterId: input.renterId,
      ownerId: input.ownerId,
      vehicleId: input.vehicleId,
      vehicleTitle: input.vehicleTitle,
      startDate: input.startDate,
      endDate: input.endDate,
      pricingType: input.pricingType,
      baseRate: input.baseRate,
      totalUnits,
      subtotal,
      insuranceFee: input.insuranceFee || 0,
      loyaltyDiscount,
      corporateDiscount,
      totalAmount: Math.max(totalAmount, 0), // no negative amounts
      securityDeposit: input.securityDeposit || 0,
      hasInsurance: input.hasInsurance || false,
      insuranceType: input.insuranceType,
      isCorporate: input.isCorporate || false,
      companyId: input.companyId,
      companyName: input.companyName,
      renterNotes: input.renterNotes,
      statusHistory: [{ status: BookingStatus.PENDING, changedBy: input.renterId }],
    });

    // TODO: Publish event for Vehicle Service to block dates + Notification

    return booking;
  } finally {
    await releaseLock(lockKey, lockValue);
  }
}

// ─── Status Updates ─────────────────────────────────────────

export async function manageBooking(bookingId: string, userId: string, role: string, action: 'CONFIRM' | 'REJECT' | 'START' | 'COMPLETE') {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new BookingError('Booking not found', 404);

  // Check permissions (Admin can do anything)
  if (role !== 'ADMIN') {
    if (action === 'CONFIRM' || action === 'REJECT') {
      if (booking.ownerId !== userId) throw new BookingError('Not authorized', 403);
    }
    if (action === 'START' || action === 'COMPLETE') {
       if (booking.ownerId !== userId && booking.renterId !== userId) throw new BookingError('Not authorized', 403);
    }
  }

  const actionMap: Record<string, string> = {
    CONFIRM: BookingStatus.CONFIRMED,
    REJECT: BookingStatus.REJECTED,
    START: BookingStatus.ACTIVE,
    COMPLETE: BookingStatus.COMPLETED,
  };

  const nextStatus = actionMap[action];
  
  if (!isValidTransition(booking.status, nextStatus)) {
    throw new BookingError(`Invalid transition from ${booking.status} to ${nextStatus}`, 400);
  }

  booking.status = nextStatus as any;
  booking.statusHistory.push({ status: nextStatus, changedBy: userId, timestamp: new Date() });

  if (action === 'CONFIRM') booking.confirmedAt = new Date();
  if (action === 'START') booking.activatedAt = new Date();
  if (action === 'COMPLETE') {
    booking.completedAt = new Date();
    booking.actualReturnDate = new Date();
    // TODO: Queue earn loyalty points job
  }

  await booking.save();
  return booking;
}

// ─── Cancel ─────────────────────────────────────────────────

export async function cancelBooking(bookingId: string, userId: string, reason: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new BookingError('Booking not found', 404);

  if (booking.renterId !== userId && booking.ownerId !== userId) {
    throw new BookingError('Not authorized', 403);
  }

  if (!isValidTransition(booking.status, BookingStatus.CANCELLED)) {
    throw new BookingError(`Cannot cancel a ${booking.status} booking`, 400);
  }

  let refundPercent = 0;
  if (booking.renterId === userId) {
    const hoursToStart = dayjs(booking.startDate).diff(dayjs(), 'hour');
    if (hoursToStart >= config.cancellation.fullRefundHours) {
      refundPercent = 100;
    } else if (hoursToStart >= config.cancellation.partialRefundHours) {
      refundPercent = config.cancellation.partialRefundPercent;
    }
  } else {
    // Owner cancelled — usually full refund to renter + potential penalty for owner
    refundPercent = 100;
  }

  booking.status = BookingStatus.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancelledBy = userId;
  booking.cancellationReason = reason;
  booking.refundPercent = refundPercent;
  booking.refundAmount = (booking.totalAmount * refundPercent) / 100;
  
  booking.statusHistory.push({ status: BookingStatus.CANCELLED, changedBy: userId, note: reason, timestamp: new Date() });

  await booking.save();
  
  // TODO: Publish event for Vehicle Service to unblock dates

  return booking;
}

// ─── Queries ────────────────────────────────────────────────

export async function getBookingById(bookingId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new BookingError('Booking not found', 404);
  return booking;
}

export async function getUserBookings(userId: string, role: 'RENTER' | 'OWNER', page = 1, limit = 20) {
  const filter = role === 'RENTER' ? { renterId: userId } : { ownerId: userId };
  const skip = (page - 1) * limit;

  const bookings = await Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Booking.countDocuments(filter);

  return { bookings, total, page, totalPages: Math.ceil(total / limit) };
}
