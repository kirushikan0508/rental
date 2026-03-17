/**
 * @file services/payout.service.ts
 * @description Manages payouts to vehicle owners via Stripe Connect.
 */

import { PrismaClient, PayoutStatus, PaymentStatus } from '@prisma/client';
import { stripe } from '../utils/stripe.util';
import { PaymentError } from './payment.service';
import { config } from '../config';

const prisma = new PrismaClient();

/**
 * Creates a Stripe Connect Express account for an owner.
 */
export async function createConnectAccount(ownerId: string, email: string) {
  let account = await prisma.ownerAccount.findUnique({ where: { ownerId } });

  if (account?.stripeAccountId) {
    return createAccountLink(account.stripeAccountId);
  }

  // Create Stripe Account
  const stripeAccount = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { ownerId },
  });

  account = await prisma.ownerAccount.upsert({
    where: { ownerId },
    update: { stripeAccountId: stripeAccount.id },
    create: { ownerId, stripeAccountId: stripeAccount.id },
  });

  return createAccountLink(stripeAccount.id);
}

/**
 * Generates an onboarding link for Stripe Connect.
 */
async function createAccountLink(accountId: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${config.corsOrigins[0]}/owner/payouts/refresh`,
    return_url: `${config.corsOrigins[0]}/owner/payouts/success`,
    type: 'account_onboarding',
  });
  return link.url;
}

/**
 * Triggers a payout to an owner's connected Stripe account.
 * This is called automatically after a booking is COMPLETED.
 */
export async function processPayoutForBooking(bookingId: string) {
  const payment = await prisma.payment.findFirst({
    where: { bookingId, status: PaymentStatus.SUCCEEDED },
  });

  if (!payment) throw new PaymentError('No successful payment found for this booking');
  if (payment.payoutId) throw new PaymentError('Payout already processed for this payment');
  if (payment.ownerAmount <= 0) throw new PaymentError('No amount to payout');

  const ownerAccount = await prisma.ownerAccount.findUnique({ where: { ownerId: payment.ownerId } });
  
  if (!ownerAccount || !ownerAccount.stripeAccountId || !ownerAccount.payoutsEnabled) {
    throw new PaymentError('Owner has not completed Stripe onboarding');
  }

  // Record Pending Payout
  const payout = await prisma.payout.create({
    data: {
      ownerId: payment.ownerId,
      stripeAccountId: ownerAccount.stripeAccountId,
      amount: payment.ownerAmount,
      currency: payment.currency,
      status: PayoutStatus.PENDING,
      payments: { connect: { id: payment.id } }
    }
  });

  try {
    // Stripe Transfer (Funds move from Platform to Connect Account)
    const transfer = await stripe.transfers.create({
      amount: payment.ownerAmount,
      currency: payment.currency,
      destination: ownerAccount.stripeAccountId,
      transfer_group: bookingId,
      metadata: { payoutId: payout.id, bookingId }
    });

    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        providerPayoutId: transfer.id,
        status: PayoutStatus.PAID,
      }
    });

    return payout;
  } catch (err: any) {
    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: PayoutStatus.FAILED, errorMessage: err.message },
    });
    throw err;
  }
}
