/**
 * @file payment.model.ts
 * @description Mongoose schema for the `payments` collection.
 *
 * Records all financial transactions — booking payments, refunds,
 * owner payouts, and subscription charges. Supports Stripe and
 * PayHere gateways with webhook event logging.
 *
 * @collection payments
 * @indexes bookingId, renterId+status, ownerId+status,
 *          gatewayPaymentId, paymentRef(unique), status+createdAt
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum PaymentGateway {
  STRIPE  = 'STRIPE',
  PAYHERE = 'PAYHERE',
}

export enum PaymentStatus {
  PENDING            = 'PENDING',
  PROCESSING         = 'PROCESSING',
  SUCCESS            = 'SUCCESS',
  FAILED             = 'FAILED',
  REFUNDED           = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentType {
  BOOKING      = 'BOOKING',
  REFUND       = 'REFUND',
  PAYOUT       = 'PAYOUT',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IRefund {
  refundId: string;
  amount: number;
  reason: string;
  refundedAt: Date;
}

export interface IPayout {
  payoutId: string;
  ownerAmount: number;
  commissionAmount: number;
  payoutStatus: string;
  paidAt?: Date;
}

export interface IPaymentMetadata {
  ipAddress: string;
  userAgent: string;
}

export interface IWebhookEvent {
  event: string;
  receivedAt: Date;
  raw: Record<string, unknown>;
}

export interface IPayment {
  paymentRef: string;
  bookingId: Types.ObjectId;
  renterId: Types.ObjectId;
  ownerId: Types.ObjectId;
  gateway: PaymentGateway;
  gatewayPaymentId?: string;
  gatewayCustomerId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  refund?: IRefund;
  payout?: IPayout;
  metadata?: IPaymentMetadata;
  webhookEvents: IWebhookEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentDocument extends IPayment, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const refundSchema = new Schema<IRefund>(
  {
    refundId:   { type: String, required: true },
    amount:     { type: Number, required: true, min: 0 },
    reason:     { type: String, required: true },
    refundedAt: { type: Date, required: true },
  },
  { _id: false },
);

const payoutSchema = new Schema<IPayout>(
  {
    payoutId:         { type: String, required: true },
    ownerAmount:      { type: Number, required: true, min: 0 },
    commissionAmount: { type: Number, required: true, min: 0 },
    payoutStatus:     { type: String, required: true },
    paidAt:           { type: Date },
  },
  { _id: false },
);

const paymentMetadataSchema = new Schema<IPaymentMetadata>(
  {
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: false },
);

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    event:      { type: String, required: true },
    receivedAt: { type: Date, required: true },
    raw:        { type: Schema.Types.Mixed },
  },
  { _id: false },
);

// ─── Utility ────────────────────────────────────────────────

function generatePaymentRef(): string {
  const prefix = 'PAY';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Main Schema ────────────────────────────────────────────

const paymentSchema = new Schema<IPaymentDocument>(
  {
    /** Auto-generated unique payment reference */
    paymentRef: {
      type: String,
      unique: true,
      default: generatePaymentRef,
    },

    /** Associated booking */
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },

    /** Renter who made the payment */
    renterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Renter ID is required'],
    },

    /** Vehicle owner receiving payout */
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },

    /** Payment gateway used */
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      required: true,
    },

    /** Gateway-specific payment ID */
    gatewayPaymentId: { type: String, index: true },

    /** Gateway-specific customer ID */
    gatewayCustomerId: { type: String },

    /** Payment amount */
    amount: { type: Number, required: true, min: 0 },

    /** Currency code (ISO 4217) */
    currency: { type: String, required: true, default: 'USD' },

    /** Current payment status */
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },

    /** Transaction type */
    type: {
      type: String,
      enum: Object.values(PaymentType),
      required: true,
    },

    /** Refund details (populated on refund) */
    refund: { type: refundSchema },

    /** Owner payout details */
    payout: { type: payoutSchema },

    /** Request metadata for security */
    metadata: { type: paymentMetadataSchema },

    /** Raw webhook events from gateway */
    webhookEvents: [webhookEventSchema],
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

paymentSchema.index({ renterId: 1, status: 1 });
paymentSchema.index({ ownerId: 1, status: 1 });
paymentSchema.index({ status: 1, createdAt: 1 });

// ─── Export ─────────────────────────────────────────────────

export const Payment = model<IPaymentDocument>('Payment', paymentSchema);

/**
 * @sample
 * {
 *   "_id": "65d4e5f6789012ab34ef5678",
 *   "paymentRef": "PAY-M2K5B2-Q8R3",
 *   "bookingId": "65c3d4e5f6789012ab34ef01",
 *   "renterId": "65a1b2c3d4e5f6789012abcd",
 *   "ownerId": "65a1b2c3d4e5f6789012wxyz",
 *   "gateway": "STRIPE",
 *   "gatewayPaymentId": "pi_3OX1234567890",
 *   "amount": 77.10,
 *   "currency": "USD",
 *   "status": "SUCCESS",
 *   "type": "BOOKING",
 *   "metadata": { "ipAddress": "192.168.1.1", "userAgent": "Mozilla/5.0..." },
 *   "webhookEvents": [
 *     { "event": "payment_intent.succeeded", "receivedAt": "2024-01-28T14:10:00.000Z", "raw": {} }
 *   ],
 *   "createdAt": "2024-01-28T14:05:00.000Z",
 *   "updatedAt": "2024-01-28T14:10:00.000Z"
 * }
 */
