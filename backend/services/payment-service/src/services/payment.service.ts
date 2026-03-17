/**
 * @file services/payment.service.ts
 * @description Handles Stripe PaymentIntents and payment confirmation.
 */

import { PrismaClient, PaymentStatus, PaymentProvider } from '@prisma/client';
import { stripe } from '../utils/stripe.util';
import { generatePayHereSignature } from '../utils/payhere.util';
import { config } from '../config';

const prisma = new PrismaClient();

export class PaymentError extends Error {
  constructor(public message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface PaymentIntentInput {
  bookingId: string;
  renterId: string;
  ownerId: string;
  amount: number; // in cents
  currency?: string;
  provider?: 'STRIPE' | 'PAYHERE';
  idempotencyKey?: string;
}

export async function createPaymentIntent(input: PaymentIntentInput) {
  const currency = input.currency || config.finance.currency;
  const provider = input.provider || 'STRIPE';

  // 1. Idempotency Check
  if (input.idempotencyKey) {
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      return { clientSecret: existing.clientSecret, providerPaymentId: existing.providerPaymentId, paymentId: existing.id };
    }
  }

  // 2. Stripe Processing
  if (provider === 'STRIPE') {
    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amount,
        currency,
        metadata: {
          bookingId: input.bookingId,
          renterId: input.renterId,
          ownerId: input.ownerId,
        },
      },
      { idempotencyKey: input.idempotencyKey }
    );

    const payment = await prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        renterId: input.renterId,
        ownerId: input.ownerId,
        amount: input.amount,
        currency,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: intent.id,
        clientSecret: intent.client_secret,
        status: PaymentStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return { clientSecret: intent.client_secret, providerPaymentId: intent.id, paymentId: payment.id };
  }

  // 3. PayHere Processing (Local Fallback)
  if (provider === 'PAYHERE') {
    const orderId = `BKG-${input.bookingId}-${Date.now()}`;
    // Amount in exact 2 decimal places e.g., 1000.00 (from cents: 100000 -> 1000.00)
    const floatAmount = input.amount / 100;
    const hash = generatePayHereSignature(orderId, floatAmount, currency.toUpperCase());

    const payment = await prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        renterId: input.renterId,
        ownerId: input.ownerId,
        amount: input.amount,
        currency,
        provider: PaymentProvider.PAYHERE,
        providerPaymentId: orderId, // Use custom orderId for PayHere
        status: PaymentStatus.PENDING,
        idempotencyKey: input.idempotencyKey,
      },
    });

    return { 
      providerPaymentId: orderId, 
      paymentId: payment.id,
      payhere: { merchantId: config.payhere.merchantId, amount: floatAmount, currency: currency.toUpperCase(), hash }
    };
  }

  throw new PaymentError('Unsupported provider');
}

/**
 * Syncs Stripe intent status with database.
 */
export async function confirmStripePayment(intentId: string) {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId: intentId } });
  if (!payment) throw new PaymentError('Payment not found', 404);

  const intent = await stripe.paymentIntents.retrieve(intentId);

  let newStatus = payment.status;
  if (intent.status === 'succeeded') newStatus = PaymentStatus.SUCCEEDED;
  else if (intent.status === 'processing') newStatus = PaymentStatus.PROCESSING;
  else if (intent.status === 'requires_payment_method') newStatus = PaymentStatus.FAILED;
  else if (intent.status === 'canceled') newStatus = PaymentStatus.CANCELED;

  if (newStatus === PaymentStatus.SUCCEEDED && payment.status !== PaymentStatus.SUCCEEDED) {
    // 1. Get owner's subscription tier for commission
    const ownerAccount = await prisma.ownerAccount.findUnique({ where: { ownerId: payment.ownerId } });
    let commissionPercent = config.finance.defaultCommission;

    if (ownerAccount) {
      if (ownerAccount.subscriptionTier === 'PRO') commissionPercent = 10;
      if (ownerAccount.subscriptionTier === 'PREMIUM') commissionPercent = 5;
    }

    const platformFee = Math.floor(payment.amount * (commissionPercent / 100));
    const ownerAmount = payment.amount - platformFee;

    // 2. Update Payment
    // We attach the `receipt_url` if it's available on the charge
    const chargeId = intent.latest_charge as string;
    let receiptUrl = null;
    if (chargeId) {
       const charge = await stripe.charges.retrieve(chargeId);
       receiptUrl = charge.receipt_url;
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        platformFee,
        ownerAmount,
        commissionPercent,
        receiptUrl
      },
    });

    // TODO: Publish event to booking-service (Payment succeeded -> Update booking status)
    return updated;
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: newStatus },
  });

  return updated;
}
