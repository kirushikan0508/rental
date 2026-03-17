/**
 * @file services/analytics.service.ts
 * @description Aggregates revenue, commission, and payout statistics.
 */

import { PrismaClient, PaymentStatus, PayoutStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function getPlatformAnalytics(startDate?: Date, endDate?: Date) {
  const dateFilter = startDate && endDate ? { gte: startDate, lte: endDate } : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.SUCCEEDED,
      ...(dateFilter && { createdAt: dateFilter })
    },
    select: { amount: true, platformFee: true, ownerAmount: true, provider: true }
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCommission = payments.reduce((sum, p) => sum + p.platformFee, 0);
  const totalOwnerEarnings = payments.reduce((sum, p) => sum + p.ownerAmount, 0);

  const providerSplit = payments.reduce((acc, p) => {
    acc[p.provider] = (acc[p.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const payouts = await prisma.payout.findMany({
    where: { ...(dateFilter && { createdAt: dateFilter }) },
    select: { amount: true, status: true }
  });

  const pendingPayouts = payouts
    .filter(p => p.status === PayoutStatus.PENDING)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalTransactions: payments.length,
    totalRevenue,
    totalCommission,
    totalOwnerEarnings,
    providerSplit,
    pendingPayouts,
  };
}

export async function getOwnerAnalytics(ownerId: string) {
  const payments = await prisma.payment.findMany({
    where: { ownerId, status: PaymentStatus.SUCCEEDED },
    select: { ownerAmount: true }
  });

  const totalEarnings = payments.reduce((sum, p) => sum + p.ownerAmount, 0);

  const payouts = await prisma.payout.findMany({
    where: { ownerId },
    select: { amount: true, status: true }
  });

  const transferred = payouts
    .filter(p => p.status === PayoutStatus.PAID)
    .reduce((sum, p) => sum + p.amount, 0);

  const pending = payouts
    .filter(p => p.status === PayoutStatus.PENDING)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalEarnings,
    transferred,
    pending,
    availableBalance: totalEarnings - transferred - pending
  };
}
