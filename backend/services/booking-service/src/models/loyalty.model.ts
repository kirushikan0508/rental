/**
 * @file models/loyalty.model.ts
 * @description Loyalty points ledger — earn, redeem, and transaction history.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ILoyaltyTransaction extends Document {
  userId: string;
  bookingId?: string;
  type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADMIN_ADJUST';
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    userId: { type: String, required: true, index: true },
    bookingId: String,
    type: { type: String, enum: ['EARN', 'REDEEM', 'EXPIRE', 'ADMIN_ADJUST'], required: true },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

loyaltyTransactionSchema.index({ userId: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>(
  'LoyaltyTransaction',
  loyaltyTransactionSchema,
);

// ─── User Balance (aggregated) ──────────────────────────────

export interface ILoyaltyBalance extends Document {
  userId: string;
  totalPoints: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  updatedAt: Date;
}

const loyaltyBalanceSchema = new Schema<ILoyaltyBalance>(
  {
    userId: { type: String, required: true, unique: true },
    totalPoints: { type: Number, default: 0 },
    lifetimeEarned: { type: Number, default: 0 },
    lifetimeRedeemed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const LoyaltyBalance = mongoose.model<ILoyaltyBalance>(
  'LoyaltyBalance',
  loyaltyBalanceSchema,
);
