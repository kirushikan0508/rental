/**
 * @file tracking-log.model.ts
 * @description Mongoose schema for the `tracking_logs` collection.
 *
 * Stores GPS location snapshots recorded during active bookings.
 * Includes speed, heading, battery, and engine status. Supports
 * geospatial queries and auto-expires after 30 days (TTL index).
 *
 * @collection tracking_logs
 * @indexes bookingId+recordedAt, location(2dsphere), vehicleId+recordedAt
 * @ttl 30 days (createdAt)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────

export interface ITrackingLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface ITrackingLog {
  bookingId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  location: ITrackingLocation;
  speed: number;
  heading: number;
  accuracy: number;
  batteryLevel: number;
  isEngineOn: boolean;
  recordedAt: Date;
  createdAt: Date;
}

export interface ITrackingLogDocument extends ITrackingLog, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const trackingLocationSchema = new Schema<ITrackingLocation>(
  {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const trackingLogSchema = new Schema<ITrackingLogDocument>(
  {
    /** Associated active booking */
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },

    /** Tracked vehicle */
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },

    /** GeoJSON Point — current location */
    location: {
      type: trackingLocationSchema,
      required: [true, 'Location is required'],
    },

    /** Speed in km/h */
    speed: { type: Number, default: 0, min: 0 },

    /** Compass heading in degrees (0-360) */
    heading: { type: Number, default: 0, min: 0, max: 360 },

    /** GPS accuracy in meters */
    accuracy: { type: Number, default: 0, min: 0 },

    /** Device battery level (0-100) */
    batteryLevel: { type: Number, min: 0, max: 100 },

    /** Whether the vehicle engine is on */
    isEngineOn: { type: Boolean, default: false },

    /** Original timestamp from the device */
    recordedAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // no updatedAt needed for append-only logs
  },
);

// ─── Indexes ────────────────────────────────────────────────

trackingLogSchema.index({ bookingId: 1, recordedAt: 1 });
trackingLogSchema.index({ 'location': '2dsphere' });
trackingLogSchema.index({ vehicleId: 1, recordedAt: 1 });

/** TTL index — auto-delete documents after 30 days */
trackingLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// ─── Export ─────────────────────────────────────────────────

export const TrackingLog = model<ITrackingLogDocument>('TrackingLog', trackingLogSchema);

/**
 * @sample
 * {
 *   "_id": "65g789012ab34ef5678901ab",
 *   "bookingId": "65c3d4e5f6789012ab34ef01",
 *   "vehicleId": "65a1b2c3d4e5f6789012efgh",
 *   "location": { "type": "Point", "coordinates": [79.8612, 6.9271] },
 *   "speed": 45.5,
 *   "heading": 180,
 *   "accuracy": 5,
 *   "batteryLevel": 78,
 *   "isEngineOn": true,
 *   "recordedAt": "2024-02-01T10:30:00.000Z",
 *   "createdAt": "2024-02-01T10:30:01.000Z"
 * }
 */
