/**
 * @file controllers/booking.controller.ts
 * @description Express controllers for booking routes.
 */

import { Request, Response, NextFunction } from 'express';
import * as bookingSvc from '../services/booking.service';
import * as disputeSvc from '../services/dispute.service';
import * as loyaltySvc from '../services/loyalty.service';
import * as corporateSvc from '../services/corporate.service';
import { scheduleAutoExpire, scheduleBookingReminder } from '../queues/booking.queue';
import { broadcastBookingUpdate } from '../socket';

// ─── Booking CRUD ───────────────────────────────────────────

export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const renterId = req.user!.userId;
    const booking = await bookingSvc.createBooking({ renterId, ...req.body });

    // Enqueue auto-expire job
    await scheduleAutoExpire(booking._id.toString());
    
    // Broadcast notification to owner
    broadcastBookingUpdate(booking.renterId, booking.ownerId, {
      message: 'New booking request received',
      bookingId: booking._id,
      status: booking.status
    });

    res.status(201).json({ success: true, data: { booking } });
  } catch (error) { next(error); }
}

export async function getBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingSvc.getBookingById(req.params.id);
    // Simple basic auth check
    const { userId, role } = req.user!;
    if (role !== 'ADMIN' && booking.renterId !== userId && booking.ownerId !== userId) {
      res.status(403).json({ success: false, error: { message: 'Not authorized' } });
      return;
    }
    res.json({ success: true, data: { booking } });
  } catch (error) { next(error); }
}

export async function getUserBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const role = (req.query.role as 'RENTER' | 'OWNER') || 'RENTER';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await bookingSvc.getUserBookings(req.user!.userId, role, page, limit);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}

// ─── Status Management ──────────────────────────────────────

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { action } = req.body;
    const booking = await bookingSvc.manageBooking(req.params.id, req.user!.userId, req.user!.role, action);

    if (action === 'CONFIRM') {
      await scheduleBookingReminder(booking._id.toString(), booking.startDate);
    }
    if (action === 'COMPLETE') {
      // Award loyalty points
      await loyaltySvc.earnPoints(booking.renterId, booking.bookingNumber, booking.totalAmount);
    }

    // Realtime update
    broadcastBookingUpdate(booking.renterId, booking.ownerId, {
      message: `Booking status updated to ${booking.status}`,
      bookingId: booking._id,
      status: booking.status
    });

    res.json({ success: true, data: { booking } });
  } catch (error) { next(error); }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingSvc.cancelBooking(req.params.id, req.user!.userId, req.body.reason);
    
    broadcastBookingUpdate(booking.renterId, booking.ownerId, {
      message: `Booking has been cancelled`,
      bookingId: booking._id,
      status: booking.status
    });

    res.json({ success: true, data: { booking } });
  } catch (error) { next(error); }
}

// ─── Disputes ───────────────────────────────────────────────

export async function raiseDispute(req: Request, res: Response, next: NextFunction) {
  try {
    const { vehicleId, description, evidence } = req.body;
    // Need to determine role based on booking
    const booking = await bookingSvc.getBookingById(req.params.id);
    const role = booking.renterId === req.user!.userId ? 'RENTER' : 'OWNER';

    const dispute = await disputeSvc.raiseDispute(req.params.id, vehicleId, req.user!.userId, role, description, evidence);
    res.status(201).json({ success: true, data: { dispute } });
  } catch (error) { next(error); }
}

export async function resolveDispute(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, resolution, compensationAmount } = req.body;
    const dispute = await disputeSvc.resolveDispute(req.params.id, req.user!.userId, status, resolution, compensationAmount);
    res.json({ success: true, data: { dispute } });
  } catch (error) { next(error); }
}

// ─── Loyalty & Corporate ────────────────────────────────────

export async function getLoyaltyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const balance = await loyaltySvc.getBalance(req.user!.userId);
    const history = await loyaltySvc.getHistory(req.user!.userId);
    res.json({ success: true, data: { balance, history: history.transactions } });
  } catch (error) { next(error); }
}

export async function getCorporateInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await corporateSvc.generateInvoice(req.params.id);
    res.json({ success: true, data: { invoice } });
  } catch (error) { next(error); }
}
