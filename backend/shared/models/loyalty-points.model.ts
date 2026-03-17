/**
 * @file loyalty-points.model.ts
 * @description Mongoose schema for the `loyalty_points` collection.
 *
 * Manages per-user loyalty point balances with a full transaction
 * ledger (earn, redeem, expire, adjust). One document per user.
 *
 * @collection loyalty_points
 * @indexes userId (unique)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum LoyaltyTransactionType {
  EARN   = 'EARN',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
  ADJUST = 'ADJUST',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface ILoyaltyTransaction {
  type: LoyaltyTransactionType;
  points: number;
  bookingId?: Types.ObjectId;
  description: string;
  createdAt: Date;
}

export interface ILoyaltyPoints {
  userId: Types.ObjectId;
  balance: number;
  transactions: ILoyaltyTransaction[];
  totalEarned: number;
  totalRedeemed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoyaltyPointsDocument extends ILoyaltyPoints, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    /** Type of loyalty transaction */
    type: {
      type: String,
      enum: Object.values(LoyaltyTransactionType),
      required: true,
    },
    /** Number of points involved (positive for earn, negative for redeem) */
    points: { type: Number, required: true },
    /** Associated booking (if applicable) */
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    /** Human-readable description */
    description: { type: String, required: true },
    /** When the transaction occurred */
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const loyaltyPointsSchema = new Schema<ILoyaltyPointsDocument>(
  {
    /** User this loyalty account belongs to (one per user) */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },

    /** Current available balance */
    balance: { type: Number, default: 0, min: 0 },

    /** Full transaction history */
    transactions: [loyaltyTransactionSchema],

    /** Lifetime total earned */
    totalEarned: { type: Number, default: 0, min: 0 },

    /** Lifetime total redeemed */
    totalRedeemed: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  },
);

// ─── Export ─────────────────────────────────────────────────

export const LoyaltyPoints = model<ILoyaltyPointsDocument>('LoyaltyPoints', loyaltyPointsSchema);

/**
 * @sample
 * {
 *   "_id": "65j012ab34ef567890ab12345",
 *   "userId": "65a1b2c3d4e5f6789012abcd",
 *   "balance": 320,
 *   "transactions": [
 *     { "type": "EARN", "points": 77, "bookingId": "65c3d4e5f6789012ab34ef01",
 *       "description": "Earned from booking BK-M2K4A1-X7B9", "createdAt": "2024-02-03T10:00:00.000Z" },
 *     { "type": "EARN", "points": 250, "bookingId": "65c3d4e5f6789012ab34ef02",
 *       "description": "Earned from booking BK-M2K4A2-Z3C1", "createdAt": "2024-02-10T10:00:00.000Z" },
 *     { "type": "REDEEM", "points": -7, "bookingId": "65c3d4e5f6789012ab34ef03",
 *       "description": "Redeemed for booking BK-M2K4A3-W5D2", "createdAt": "2024-02-15T10:00:00.000Z" }
 *   ],
 *   "totalEarned": 327,
 *   "totalRedeemed": 7,
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-02-15T10:00:00.000Z"
 * }
 */
