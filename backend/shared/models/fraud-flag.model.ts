/**
 * @file fraud-flag.model.ts
 * @description Mongoose schema for the `fraud_flags` collection.
 *
 * Stores per-user fraud risk assessments including risk scores,
 * detected flags (multiple accounts, payment failures, etc.),
 * and admin review outcomes.
 *
 * @collection fraud_flags
 * @indexes userId(unique), riskScore+status, status
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum FraudFlagType {
  MULTIPLE_ACCOUNTS   = 'MULTIPLE_ACCOUNTS',
  PAYMENT_FAILURE     = 'PAYMENT_FAILURE',
  UNUSUAL_BOOKING     = 'UNUSUAL_BOOKING',
  REPEAT_CANCELLATION = 'REPEAT_CANCELLATION',
  IP_MISMATCH         = 'IP_MISMATCH',
  IDENTITY_MISMATCH   = 'IDENTITY_MISMATCH',
}

export enum FraudStatus {
  FLAGGED   = 'FLAGGED',
  CLEARED   = 'CLEARED',
  ESCALATED = 'ESCALATED',
  BANNED    = 'BANNED',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IFraudFlagEntry {
  type: FraudFlagType;
  details: string;
  detectedAt: Date;
}

export interface IFraudFlag {
  userId: Types.ObjectId;
  riskScore: number;
  flags: IFraudFlagEntry[];
  status: FraudStatus;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFraudFlagDocument extends IFraudFlag, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const fraudFlagEntrySchema = new Schema<IFraudFlagEntry>(
  {
    /** Type of fraud indicator */
    type: {
      type: String,
      enum: Object.values(FraudFlagType),
      required: true,
    },
    /** Description of what was detected */
    details: { type: String, required: true },
    /** When the flag was raised */
    detectedAt: { type: Date, required: true },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const fraudFlagSchema = new Schema<IFraudFlagDocument>(
  {
    /** User being assessed (one record per user) */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },

    /** Overall risk score (0-100) — higher means riskier */
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    /** Individual fraud indicators detected */
    flags: [fraudFlagEntrySchema],

    /** Current fraud assessment status */
    status: {
      type: String,
      enum: Object.values(FraudStatus),
      default: FraudStatus.FLAGGED,
      index: true,
    },

    /** Admin who reviewed the fraud case */
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    /** Admin's review notes */
    reviewNote: { type: String },

    /** When the review was completed */
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

fraudFlagSchema.index({ riskScore: -1, status: 1 });

// ─── Export ─────────────────────────────────────────────────

export const FraudFlag = model<IFraudFlagDocument>('FraudFlag', fraudFlagSchema);

/**
 * @sample
 * {
 *   "_id": "65m3ab34ef567890ab12345678",
 *   "userId": "65a1b2c3d4e5f6789012suspect",
 *   "riskScore": 72,
 *   "flags": [
 *     { "type": "REPEAT_CANCELLATION", "details": "5 cancellations in 7 days", "detectedAt": "2024-02-01T00:00:00.000Z" },
 *     { "type": "IP_MISMATCH", "details": "Login from 3 different countries in 24h", "detectedAt": "2024-02-02T00:00:00.000Z" }
 *   ],
 *   "status": "FLAGGED",
 *   "createdAt": "2024-02-01T00:00:00.000Z",
 *   "updatedAt": "2024-02-02T00:00:00.000Z"
 * }
 */
