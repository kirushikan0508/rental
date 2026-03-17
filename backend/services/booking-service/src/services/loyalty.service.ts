/**
 * @file services/loyalty.service.ts
 * @description Earn, redeem, and fetch transaction history for loyalty points.
 */

import { LoyaltyBalance, LoyaltyTransaction } from '../models';
import { config } from '../config';

/**
 * Earn points for a completed booking.
 */
export async function earnPoints(userId: string, bookingId: string, amountSpent: number): Promise<void> {
  const points = Math.floor(amountSpent * config.loyalty.pointsPerDollar);
  if (points <= 0) return;

  const balance = await LoyaltyBalance.findOneAndUpdate(
    { userId },
    { $inc: { totalPoints: points, lifetimeEarned: points } },
    { new: true, upsert: true }
  );

  await LoyaltyTransaction.create({
    userId,
    bookingId,
    type: 'EARN',
    points,
    balanceAfter: balance.totalPoints,
    description: `Earned points for booking ${bookingId}`,
  });
}

/**
 * Redeems points. Returns the discount amount.
 */
export async function redeemPoints(userId: string, bookingId: string, pointsToRedeem: number): Promise<number> {
  if (pointsToRedeem <= 0) return 0;

  const balance = await LoyaltyBalance.findOne({ userId });
  if (!balance || balance.totalPoints < pointsToRedeem) {
    throw new Error('Insufficient points');
  }

  const newBalance = await LoyaltyBalance.findOneAndUpdate(
    { userId },
    { $inc: { totalPoints: -pointsToRedeem, lifetimeRedeemed: pointsToRedeem } },
    { new: true }
  );

  await LoyaltyTransaction.create({
    userId,
    bookingId,
    type: 'REDEEM',
    points: -pointsToRedeem,
    balanceAfter: newBalance!.totalPoints,
    description: `Redeemed points for booking ${bookingId}`,
  });

  return pointsToRedeem * config.loyalty.conversionRate;
}

/**
 * Gets user balance.
 */
export async function getBalance(userId: string) {
  let balance = await LoyaltyBalance.findOne({ userId });
  if (!balance) {
    balance = await LoyaltyBalance.create({ userId });
  }
  return balance;
}

/**
 * Gets user transaction history.
 */
export async function getHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const transactions = await LoyaltyTransaction.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await LoyaltyTransaction.countDocuments({ userId });

  return { transactions, total, page, totalPages: Math.ceil(total / limit) };
}
