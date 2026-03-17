/**
 * @file routes/booking.routes.ts
 * @description API routes for bookings.
 */

import { Router } from 'express';
import * as ctrl from '../controllers/booking.controller';
import { authenticate, authorize, validate } from '../middleware';
import {
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  raiseDisputeSchema,
  resolveDisputeSchema
} from '../validators/booking.validator';

const router = Router();

// ─── Booking Lifecycle ──────────────────────────────────────

router.post('/', authenticate, authorize('RENTER'), validate(createBookingSchema), ctrl.createBooking);
router.get('/', authenticate, ctrl.getUserBookings);
router.get('/:id', authenticate, ctrl.getBooking);
router.patch('/:id/status', authenticate, validate(updateBookingStatusSchema), ctrl.updateBookingStatus);
router.patch('/:id/cancel', authenticate, validate(cancelBookingSchema), ctrl.cancelBooking);

// ─── Disputes ───────────────────────────────────────────────

router.post('/:id/dispute', authenticate, validate(raiseDisputeSchema), ctrl.raiseDispute);
router.patch('/dispute/:id/resolve', authenticate, authorize('ADMIN', 'SUPPORT'), validate(resolveDisputeSchema), ctrl.resolveDispute);

// ─── Loyalty & Corporate ────────────────────────────────────

router.get('/loyalty/profile', authenticate, ctrl.getLoyaltyProfile);
router.get('/:id/invoice', authenticate, ctrl.getCorporateInvoice); // Would add RBAC for valid user/company admin in real implementation

export default router;
