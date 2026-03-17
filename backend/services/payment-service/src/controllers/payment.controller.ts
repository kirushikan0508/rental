/**
 * @file controllers/payment.controller.ts
 * @description Handlers for all payment, refund, payout, and invoice routes.
 */

import { Request, Response, NextFunction } from 'express';
import * as paymentSvc from '../services/payment.service';
import * as refundSvc from '../services/refund.service';
import * as payoutSvc from '../services/payout.service';
import * as subSvc from '../services/subscription.service';
import * as invoiceSvc from '../services/invoice.service';
import * as analyticsSvc from '../services/analytics.service';
import { schedulePayoutAndInvoice } from '../queues/payout.queue';

// ─── Payment Processing ──────────────────────────────────────

export async function createIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const renterId = req.user!.userId;
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    const result = await paymentSvc.createPaymentIntent({
      ...req.body,
      renterId,
      idempotencyKey,
    });
    
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function processRefund(req: Request, res: Response, next: NextFunction) {
  try {
    const { bookingId, amountToRefund, reason } = req.body;
    const requestedBy = req.user!.userId;

    const refund = await refundSvc.processRefund(bookingId, amountToRefund, reason, requestedBy);
    res.json({ success: true, data: { refund } });
  } catch (error) { next(error); }
}

// ─── Payouts & Subscriptions ────────────────────────────────

export async function setupConnectAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user!.userId;
    const url = await payoutSvc.createConnectAccount(ownerId, req.body.email);
    res.json({ success: true, data: { url } });
  } catch (error) { next(error); }
}

export async function triggerOwnerPayoutAsync(req: Request, res: Response, next: NextFunction) {
  try {
    // Usually triggered by a webhook/event from booking-service when status = COMPLETED
    // Exposing it here for the scope of the assignment
    await schedulePayoutAndInvoice(req.body.bookingId);
    res.json({ success: true, message: 'Payout and invoicing scheduled' });
  } catch (error) { next(error); }
}

export async function createSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user!.userId;
    const { tier, email } = req.body;
    const url = await subSvc.createSubscriptionCheckout(ownerId, email, tier);
    res.json({ success: true, data: { url } });
  } catch (error) { next(error); }
}

export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user!.userId;
    await subSvc.cancelSubscription(ownerId);
    res.json({ success: true, message: 'Subscription canceled' });
  } catch (error) { next(error); }
}

// ─── Invoicing ──────────────────────────────────────────────

export async function generateInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceSvc.generateAndEmailInvoice(req.params.bookingId);
    res.json({ success: true, data: { invoice } });
  } catch (error) { next(error); }
}

// ─── Analytics ──────────────────────────────────────────────

export async function getAdminAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const analytics = await analyticsSvc.getPlatformAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) { next(error); }
}

export async function getOwnerAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user!.userId;
    const analytics = await analyticsSvc.getOwnerAnalytics(ownerId);
    res.json({ success: true, data: analytics });
  } catch (error) { next(error); }
}
