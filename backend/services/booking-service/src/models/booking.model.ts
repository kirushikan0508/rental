/**
 * @file models/booking.model.ts
 * @description Mongoose schema for bookings with full state machine,
 * pricing breakdown, insurance, and corporate fields.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type BookingStatusType = typeof BookingStatus[keyof typeof BookingStatus];

export const PricingType = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
} as const;
export type PricingTypeValue = typeof PricingType[keyof typeof PricingType];

// ─── Interfaces ─────────────────────────────────────────────

export interface IBooking extends Document {
  bookingNumber: string;
  renterId: string;
  ownerId: string;
  vehicleId: string;
  vehicleTitle: string;

  // Dates
  startDate: Date;
  endDate: Date;
  actualReturnDate?: Date;

  // Pricing
  pricingType: PricingTypeValue;
  baseRate: number;
  totalUnits: number;
  subtotal: number;
  insuranceFee: number;
  loyaltyDiscount: number;
  corporateDiscount: number;
  totalAmount: number;
  currency: string;
  securityDeposit: number;

  // Insurance
  hasInsurance: boolean;
  insuranceType?: string;

  // Status
  status: BookingStatusType;
  statusHistory: { status: string; timestamp: Date; note?: string; changedBy?: string }[];

  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  refundAmount: number;
  refundPercent: number;

  // Corporate
  isCorporate: boolean;
  companyId?: string;
  companyName?: string;
  invoiceId?: string;

  // Loyalty
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;

  // Notes
  renterNotes?: string;
  ownerNotes?: string;
  adminNotes?: string;

  // Timestamps
  confirmedAt?: Date;
  activatedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    renterId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    vehicleId: { type: String, required: true, index: true },
    vehicleTitle: { type: String, required: true },

    // Dates
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    actualReturnDate: Date,

    // Pricing
    pricingType: {
      type: String,
      enum: Object.values(PricingType),
      required: true,
    },
    baseRate: { type: Number, required: true },
    totalUnits: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    insuranceFee: { type: Number, default: 0 },
    loyaltyDiscount: { type: Number, default: 0 },
    corporateDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    securityDeposit: { type: Number, default: 0 },

    // Insurance
    hasInsurance: { type: Boolean, default: false },
    insuranceType: String,

    // Status
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        changedBy: String,
      },
    ],

    // Cancellation
    cancelledAt: Date,
    cancelledBy: String,
    cancellationReason: String,
    refundAmount: { type: Number, default: 0 },
    refundPercent: { type: Number, default: 0 },

    // Corporate
    isCorporate: { type: Boolean, default: false },
    companyId: String,
    companyName: String,
    invoiceId: String,

    // Loyalty
    loyaltyPointsEarned: { type: Number, default: 0 },
    loyaltyPointsRedeemed: { type: Number, default: 0 },

    // Notes
    renterNotes: String,
    ownerNotes: String,
    adminNotes: String,

    // Timestamps
    confirmedAt: Date,
    activatedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Compound Indexes ───────────────────────────────────────

bookingSchema.index({ vehicleId: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ status: 1, startDate: 1 });
bookingSchema.index({ renterId: 1, status: 1 });
bookingSchema.index({ companyId: 1, createdAt: -1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
