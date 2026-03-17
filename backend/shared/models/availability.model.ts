/**
 * @file availability.model.ts
 * @description Mongoose schema for the `availability` collection.
 *
 * Manages per-vehicle availability — blocked dates and custom pricing
 * overrides for specific dates (e.g., holidays, peak seasons).
 *
 * @collection availability
 * @indexes vehicleId (unique)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────

export interface IBlockedDate {
  date: Date;
  reason: string;
  bookingId?: Types.ObjectId;
}

export interface ICustomPricing {
  date: Date;
  hourlyRate: number;
  dailyRate: number;
}

export interface IAvailability {
  vehicleId: Types.ObjectId;
  blockedDates: IBlockedDate[];
  customPricing: ICustomPricing[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAvailabilityDocument extends IAvailability, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const blockedDateSchema = new Schema<IBlockedDate>(
  {
    /** The blocked date */
    date: { type: Date, required: true },
    /** Reason for blocking (e.g., "maintenance", "personal use") */
    reason: { type: String, required: true, trim: true },
    /** Associated booking ID if blocked by a booking */
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  },
  { _id: false },
);

const customPricingSchema = new Schema<ICustomPricing>(
  {
    /** The date for custom pricing */
    date: { type: Date, required: true },
    /** Custom hourly rate for this date */
    hourlyRate: { type: Number, required: true, min: 0 },
    /** Custom daily rate for this date */
    dailyRate: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const availabilitySchema = new Schema<IAvailabilityDocument>(
  {
    /** Reference to the vehicle (one availability doc per vehicle) */
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
      unique: true,
    },

    /** List of dates when the vehicle is not available */
    blockedDates: [blockedDateSchema],

    /** Custom pricing overrides for specific dates */
    customPricing: [customPricingSchema],
  },
  {
    timestamps: true,
  },
);

// ─── Export ─────────────────────────────────────────────────

export const Availability = model<IAvailabilityDocument>('Availability', availabilitySchema);

/**
 * @sample
 * {
 *   "_id": "65b2c3d4e5f67890ab12cd01",
 *   "vehicleId": "65a1b2c3d4e5f6789012efgh",
 *   "blockedDates": [
 *     { "date": "2024-02-14T00:00:00.000Z", "reason": "Personal use" },
 *     { "date": "2024-02-15T00:00:00.000Z", "reason": "Maintenance" }
 *   ],
 *   "customPricing": [
 *     { "date": "2024-04-14T00:00:00.000Z", "hourlyRate": 10, "dailyRate": 60 }
 *   ],
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 */
