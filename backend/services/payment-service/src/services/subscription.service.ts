/**
 * @file services/subscription.service.ts
 * @description Manages owner subscription tiers for lower commission rates.
 */

import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client';
import { stripe } from '../utils/stripe.util';
import { config } from '../config';
import { PaymentError } from './payment.service';

const prisma = new PrismaClient();

const planMap: Record<SubscriptionTier, string | undefined> = {
  BASIC: config.plans.basic, // Optional
  PRO: config.plans.pro,
  PREMIUM: config.plans.premium,
};

export async function createSubscriptionCheckout(ownerId: string, email: string, tier: SubscriptionTier) {
  if (tier === SubscriptionTier.BASIC) {
    throw new PaymentError('Basic tier is free and requires no subscription');
  }

  const priceId = planMap[tier];
  if (!priceId) throw new PaymentError(`No Stripe price ID configured for tier: ${tier}`);

  // Get or Create Customer
  let ownerAccount = await prisma.ownerAccount.findUnique({ where: { ownerId } });
  let customerId = ownerAccount?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { ownerId } });
    customerId = customer.id;
    
    ownerAccount = await prisma.ownerAccount.upsert({
      where: { ownerId },
      update: { stripeCustomerId: customerId },
      create: { ownerId, stripeCustomerId: customerId },
    });
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.corsOrigins[0]}/owner/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.corsOrigins[0]}/owner/subscription/cancel`,
    metadata: { ownerId, tier },
  });

  return session.url;
}

export async function cancelSubscription(ownerId: string) {
  const account = await prisma.ownerAccount.findUnique({ where: { ownerId } });
  
  if (!account || !account.stripeSubscriptionId) {
    throw new PaymentError('No active subscription found');
  }

  await stripe.subscriptions.cancel(account.stripeSubscriptionId);

  return prisma.ownerAccount.update({
    where: { ownerId },
    data: {
      subscriptionTier: SubscriptionTier.BASIC,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      currentPeriodEnd: null,
      stripeSubscriptionId: null,
    }
  });
}
