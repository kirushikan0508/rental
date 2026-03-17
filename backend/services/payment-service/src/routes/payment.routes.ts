/**
 * @file routes/payment.routes.ts
 * @description Express routing for payment-service endpoints.
 */

import { Router } from 'express';
import express from 'express';
import * as ctrl from '../controllers/payment.controller';
import { handleStripeWebhook } from '../webhooks/stripe.webhook';
import { authenticate, authorize, validate } from '../middleware';
import { 
  createIntentSchema, refundSchema, connectAccountSchema, subscribeSchema, triggerPayoutSchema 
} from '../validators/payment.validator';

const router = Router();

// ─── Webhooks ───────────────────────────────────────────────
// Webhooks need raw body for signature verification, so they bypass JSON parser
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// ─── Everything below requires authentication ─────────────────
router.use(express.json({ limit: '10kb' }));
router.use(authenticate);

// ─── Renter ─────────────────────────────────────────────────
router.post('/intent', authorize('RENTER'), validate(createIntentSchema), ctrl.createIntent);

// ─── Owner ──────────────────────────────────────────────────
router.post('/owner/connect', authorize('OWNER'), validate(connectAccountSchema), ctrl.setupConnectAccount);
router.post('/owner/subscribe', authorize('OWNER'), validate(subscribeSchema), ctrl.createSubscription);
router.delete('/owner/subscribe', authorize('OWNER'), ctrl.cancelSubscription);
router.get('/owner/analytics', authorize('OWNER'), ctrl.getOwnerAnalytics);

// ─── Cross-Service / Internal Actions ───────────────────────
// In real-world, might be restricted to an INTERNAL role or verified microservice
router.post('/refund', authorize('ADMIN', 'SUPPORT', 'RENTER', 'OWNER'), validate(refundSchema), ctrl.processRefund);
router.post('/payout/trigger', authorize('ADMIN', 'SYSTEM'), validate(triggerPayoutSchema), ctrl.triggerOwnerPayoutAsync);
router.post('/invoice/:bookingId', ctrl.generateInvoice);

// ─── Admin Analytics ────────────────────────────────────────
router.get('/admin/analytics', authorize('ADMIN', 'FINANCE'), ctrl.getAdminAnalytics);

export default router;
