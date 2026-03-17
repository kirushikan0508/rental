/**
 * @file booking.model.ts
 * @description Mongoose schema for the `bookings` collection.
 *
 * Tracks the full lifecycle of a vehicle rental — from pending request
 * through confirmation, active rental, completion or cancellation.
 * Includes pricing breakdown, inspections, insurance, and corporate booking support.
 *
 * @collection bookings
 * @indexes renterId+status, ownerId+status, vehicleId+status,
 *          bookingRef(unique), startDateTime+endDateTime, status+createdAt
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum BookingStatus {
  PENDING    = 'PENDING',
  CONFIRMED  = 'CONFIRMED',
  ACTIVE     = 'ACTIVE',
  COMPLETED  = 'COMPLETED',
  CANCELLED  = 'CANCELLED',
  DISPUTED   = 'DISPUTED',
}

export enum PricingType {
  HOURLY  = 'HOURLY',
  DAILY   = 'DAILY',
  WEEKLY  = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IBookingPricing {
  baseAmount: number;
  discountAmount: number;
  loyaltyDiscount: number;
  insuranceAmount: number;
  commissionAmount: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
}

export interface ICancellation {
  cancelledBy: Types.ObjectId;
  cancelledAt: Date;
  reason: string;
  refundAmount: number;
}

export interface IInsurance {
  selected: boolean;
  provider: string;
  amount: number;
  policyNumber: string;
}

export interface IInspection {
  images: { url: string; key: string }[];
  notes: string;
  submittedAt: Date;
}

export interface ICorporateBooking {
  isCorpBooking: boolean;
  companyId: string;
  invoiceNumber: string;
}

export interface IPickupLocation {
  address: string;
  lat: number;
  lng: number;
}

export interface IBooking {
  bookingRef: string;
  renterId: Types.ObjectId;
  ownerId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  pricingType: PricingType;
  startDateTime: Date;
  endDateTime: Date;
  actualReturnDateTime?: Date;
  totalHours: number;
  totalDays: number;
  pricing: IBookingPricing;
  status: BookingStatus;
  cancellation?: ICancellation;
  insurance?: IInsurance;
  preInspection?: IInspection;
  postInspection?: IInspection;
  corporateBooking?: ICorporateBooking;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  pickupLocation?: IPickupLocation;
  notes?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingDocument extends IBooking, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const inspectionImageSchema = new Schema(
  { url: { type: String, required: true }, key: { type: String, required: true } },
  { _id: false },
);

const bookingPricingSchema = new Schema<IBookingPricing>(
  {
    baseAmount:       { type: Number, required: true, min: 0 },
    discountAmount:   { type: Number, default: 0, min: 0 },
    loyaltyDiscount:  { type: Number, default: 0, min: 0 },
    insuranceAmount:  { type: Number, default: 0, min: 0 },
    commissionAmount: { type: Number, required: true, min: 0 },
    platformFee:      { type: Number, required: true, min: 0 },
    totalAmount:      { type: Number, required: true, min: 0 },
    currency:         { type: String, required: true, default: 'USD' },
  },
  { _id: false },
);

const cancellationSchema = new Schema<ICancellation>(
  {
    cancelledBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledAt:  { type: Date, required: true },
    reason:       { type: String, required: true },
    refundAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const insuranceSchema = new Schema<IInsurance>(
  {
    selected:     { type: Boolean, default: false },
    provider:     { type: String },
    amount:       { type: Number, min: 0 },
    policyNumber: { type: String },
  },
  { _id: false },
);

const inspectionSchema = new Schema<IInspection>(
  {
    images:      [inspectionImageSchema],
    notes:       { type: String },
    submittedAt: { type: Date },
  },
  { _id: false },
);

const corporateBookingSchema = new Schema<ICorporateBooking>(
  {
    isCorpBooking: { type: Boolean, default: false },
    companyId:     { type: String },
    invoiceNumber: { type: String },
  },
  { _id: false },
);

const pickupLocationSchema = new Schema<IPickupLocation>(
  {
    address: { type: String, required: true },
    lat:     { type: Number, required: true },
    lng:     { type: Number, required: true },
  },
  { _id: false },
);

// ─── Utility: Generate Booking Reference ────────────────────

function generateBookingRef(): string {
  const prefix = 'BK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Main Schema ────────────────────────────────────────────

const bookingSchema = new Schema<IBookingDocument>(
  {
    /** Auto-generated unique booking reference */
    bookingRef: {
      type: String,
      unique: true,
      default: generateBookingRef,
    },

    /** Renter who made the booking */
    renterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Renter ID is required'],
    },

    /** Vehicle owner */
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },

    /** Booked vehicle */
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },

    /** Type of pricing applied */
    pricingType: {
      type: String,
      enum: Object.values(PricingType),
      required: true,
    },

    /** Booking start date & time */
    startDateTime: { type: Date, required: [true, 'Start date is required'] },

    /** Booking end date & time */
    endDateTime: { type: Date, required: [true, 'End date is required'] },

    /** Actual return date & time (filled on completion) */
    actualReturnDateTime: { type: Date },

    /** Calculated total hours */
    totalHours: { type: Number, min: 0 },

    /** Calculated total days */
    totalDays: { type: Number, min: 0 },

    /** Pricing breakdown */
    pricing: { type: bookingPricingSchema, required: true },

    /** Current booking status */
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },

    /** Cancellation details (populated on cancel) */
    cancellation: { type: cancellationSchema },

    /** Rental insurance selection */
    insurance: { type: insuranceSchema },

    /** Pre-rental vehicle inspection */
    preInspection: { type: inspectionSchema },

    /** Post-rental vehicle inspection */
    postInspection: { type: inspectionSchema },

    /** Corporate booking metadata */
    corporateBooking: { type: corporateBookingSchema },

    /** Loyalty points earned from this booking */
    loyaltyPointsEarned: { type: Number, default: 0, min: 0 },

    /** Loyalty points redeemed for this booking */
    loyaltyPointsRedeemed: { type: Number, default: 0, min: 0 },

    /** Pickup location for the booking */
    pickupLocation: { type: pickupLocationSchema },

    /** Notes from the renter */
    notes: { type: String, maxlength: 1000 },

    /** Internal notes by admin */
    adminNotes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ────────────────────────────────────────────────

bookingSchema.index({ renterId: 1, status: 1 });
bookingSchema.index({ ownerId: 1, status: 1 });
bookingSchema.index({ vehicleId: 1, status: 1 });
bookingSchema.index({ startDateTime: 1, endDateTime: 1 });
bookingSchema.index({ status: 1, createdAt: 1 });

// ─── Export ─────────────────────────────────────────────────

export const Booking = model<IBookingDocument>('Booking', bookingSchema);

/**
 * @sample
 * {
 *   "_id": "65c3d4e5f6789012ab34ef01",
 *   "bookingRef": "BK-M2K4A1-X7B9",
 *   "renterId": "65a1b2c3d4e5f6789012abcd",
 *   "ownerId": "65a1b2c3d4e5f6789012wxyz",
 *   "vehicleId": "65a1b2c3d4e5f6789012efgh",
 *   "pricingType": "DAILY",
 *   "startDateTime": "2024-02-01T09:00:00.000Z",
 *   "endDateTime": "2024-02-03T09:00:00.000Z",
 *   "totalHours": 48,
 *   "totalDays": 2,
 *   "pricing": {
 *     "baseAmount": 70, "discountAmount": 0, "loyaltyDiscount": 5,
 *     "insuranceAmount": 10, "commissionAmount": 7, "platformFee": 2.10,
 *     "totalAmount": 77.10, "currency": "USD"
 *   },
 *   "status": "CONFIRMED",
 *   "loyaltyPointsEarned": 77,
 *   "loyaltyPointsRedeemed": 0,
 *   "createdAt": "2024-01-28T14:00:00.000Z",
 *   "updatedAt": "2024-01-28T14:05:00.000Z"
 * }
 */
