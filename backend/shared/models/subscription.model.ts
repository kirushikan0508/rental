/**
 * @file subscription.model.ts
 * @description Mongoose schema for the `subscriptions` collection.
 *
 * Manages vehicle owner subscription plans (Basic, Pro, Premium)
 * that determine commission rates and feature access. Integrates
 * with Stripe for recurring billing.
 *
 * @collection subscriptions
 * @indexes ownerId(unique), status
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum SubscriptionPlan {
  BASIC   = 'BASIC',
  PRO     = 'PRO',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionStatus {
  ACTIVE    = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE  = 'PAST_DUE',
  TRIALING  = 'TRIALING',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface ISubscription {
  ownerId: Types.ObjectId;
  plan: SubscriptionPlan;
  commissionRate: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionDocument extends ISubscription, Document<Types.ObjectId> {}

// ─── Commission Rates ───────────────────────────────────────

const PLAN_COMMISSION_RATES: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.BASIC]:   15,
  [SubscriptionPlan.PRO]:     10,
  [SubscriptionPlan.PREMIUM]:  5,
};

// ─── Main Schema ────────────────────────────────────────────

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    /** Vehicle owner (one subscription per owner) */
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      unique: true,
    },

    /** Subscription tier */
    plan: {
      type: String,
      enum: Object.values(SubscriptionPlan),
      default: SubscriptionPlan.BASIC,
    },

    /** Platform commission percentage for this plan */
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: PLAN_COMMISSION_RATES[SubscriptionPlan.BASIC],
    },

    /** Stripe subscription ID for recurring billing */
    stripeSubscriptionId: { type: String },

    /** Stripe customer ID */
    stripeCustomerId: { type: String },

    /** Current subscription status */
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
      index: true,
    },

    /** Start of the current billing period */
    currentPeriodStart: { type: Date, required: true },

    /** End of the current billing period */
    currentPeriodEnd: { type: Date, required: true },

    /** Whether the subscription cancels at the end of the period */
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// ─── Pre-save: Auto-set commission rate based on plan ───────

subscriptionSchema.pre('save', function (next) {
  if (this.isModified('plan')) {
    this.commissionRate = PLAN_COMMISSION_RATES[this.plan];
  }
  next();
});

// ─── Export ─────────────────────────────────────────────────

export const Subscription = model<ISubscriptionDocument>('Subscription', subscriptionSchema);

/**
 * @sample
 * {
 *   "_id": "65n4ab34ef567890ab123456789",
 *   "ownerId": "65a1b2c3d4e5f6789012wxyz",
 *   "plan": "PRO",
 *   "commissionRate": 10,
 *   "stripeSubscriptionId": "sub_1OX1234567890",
 *   "stripeCustomerId": "cus_1OX0987654321",
 *   "status": "ACTIVE",
 *   "currentPeriodStart": "2024-01-01T00:00:00.000Z",
 *   "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
 *   "cancelAtPeriodEnd": false,
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
