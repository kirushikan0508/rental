/**
 * @file webhooks/stripe.webhook.ts
 * @description Listens for Stripe events like payment success, subscription changes.
 */

import { Request, Response } from 'express';
import { stripe } from '../utils/stripe.util';
import { config } from '../config';
import { logger } from '../utils/logger';
import { confirmStripePayment } from '../services/payment.service';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  let event;
  try {
    // Requires raw body buffer, which must be configured in Express middleware
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err: any) {
    logger.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as any;
        await confirmStripePayment(paymentIntent.id);
        logger.info(`💰 PaymentIntent status updated: ${paymentIntent.id}`);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as any;
        
        let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
        if (subscription.status === 'past_due') status = SubscriptionStatus.PAST_DUE;
        if (subscription.status === 'unpaid') status = SubscriptionStatus.UNPAID;
        if (subscription.status === 'canceled') status = SubscriptionStatus.CANCELED;

        await prisma.ownerAccount.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionStatus: status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          }
        });
        logger.info(`🔄 Subscription updated: ${subscription.id}`);
        break;

      // Add more cases as needed (payouts, refunds)
      default:
        logger.debug(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error(`Error processing webhook event ${event.type}:`, error);
    res.status(500).send('Webhook handler failed');
  }
}
