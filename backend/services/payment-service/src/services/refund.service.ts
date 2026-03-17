/**
 * @file services/refund.service.ts
 * @description Handles full and partial refunds via Stripe.
 */

import { PrismaClient, PaymentStatus } from '@prisma/client';
import { stripe } from '../utils/stripe.util';
import { PaymentError } from './payment.service';

const prisma = new PrismaClient();

export async function processRefund(bookingId: string, amountToRefund: number, reason: string, requestedBy: string) {
  const payment = await prisma.payment.findFirst({
    where: { bookingId, status: PaymentStatus.SUCCEEDED },
  });

  if (!payment) {
    throw new PaymentError('No successful payment found for this booking to refund');
  }

  if (amountToRefund > payment.amount) {
    throw new PaymentError('Refund amount cannot exceed original payment amount');
  }

  if (payment.provider === 'STRIPE') {
    // 1. Process Stripe Refund
    // Pass payment_intent id specifically
    const stripeRefund = await stripe.refunds.create({
      payment_intent: payment.providerPaymentId!,
      amount: amountToRefund,
      reason: 'requested_by_customer', // Or mapping
      metadata: { bookingId, requestedBy },
    });

    // 2. Create Refund Record
    const refundRecord = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: amountToRefund,
        currency: payment.currency,
        reason,
        providerRefundId: stripeRefund.id,
        status: stripeRefund.status === 'succeeded' ? PaymentStatus.SUCCEEDED : PaymentStatus.PENDING,
        createdBy: requestedBy,
      },
    });

    // 3. Update Payment Status
    const newStatus = amountToRefund === payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    return refundRecord;
  }
  
  if (payment.provider === 'PAYHERE') {
      // For PayHere, refunds might be manual or via its specific API which requires 
      // passing the authorization token. Here we create an interface wrapper.
      throw new PaymentError('PayHere refunds are processed manually via merchant dashboard.');
  }

  throw new PaymentError('Unsupported provider for refund');
}
