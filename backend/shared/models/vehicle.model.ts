/**
 * @file vehicle.model.ts
 * @description Mongoose schema for the `vehicles` collection.
 *
 * Stores all vehicle listings — cars, bikes, scooters, vans, SUVs, trucks.
 * Each vehicle belongs to an owner and includes pricing tiers, location
 * (GeoJSON Point), document proofs, and approval status.
 *
 * @collection vehicles
 * @indexes ownerId, location(2dsphere), status+isAvailable, type+fuelType,
 *          licensePlate(unique), text(title+description)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum VehicleType {
  CAR     = 'CAR',
  BIKE    = 'BIKE',
  SCOOTER = 'SCOOTER',
  VAN     = 'VAN',
  SUV     = 'SUV',
  TRUCK   = 'TRUCK',
}

export enum FuelType {
  PETROL   = 'PETROL',
  DIESEL   = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID   = 'HYBRID',
}

export enum Transmission {
  MANUAL    = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
}

export enum VehicleStatus {
  PENDING   = 'PENDING',
  APPROVED  = 'APPROVED',
  REJECTED  = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IVehiclePricing {
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  currency: string;
  depositAmount: number;
}

export interface IVehicleLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface IVehicleImage {
  url: string;
  key: string;
  isPrimary: boolean;
}

export interface IDocumentProof {
  url: string;
  key: string;
  expiryDate?: Date;
  verified: boolean;
}

export interface IVehicleDocuments {
  rcBook: { url: string; key: string; verified: boolean };
  insurance: IDocumentProof;
  pollutionCert: IDocumentProof;
}

export interface IGeofenceZone {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface IVehicle {
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  fuelType: FuelType;
  transmission: Transmission;
  seats: number;
  features: string[];
  pricing: IVehiclePricing;
  location: IVehicleLocation;
  images: IVehicleImage[];
  documents: IVehicleDocuments;
  status: VehicleStatus;
  isAvailable: boolean;
  greenScore: number;
  isEVBadge: boolean;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  geofenceZone?: IGeofenceZone;
  adminNotes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicleDocument extends IVehicle, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const vehiclePricingSchema = new Schema<IVehiclePricing>(
  {
    hourlyRate:    { type: Number, required: true, min: 0 },
    dailyRate:     { type: Number, required: true, min: 0 },
    weeklyRate:    { type: Number, required: true, min: 0 },
    monthlyRate:   { type: Number, required: true, min: 0 },
    currency:      { type: String, required: true, default: 'USD' },
    depositAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const vehicleLocationSchema = new Schema<IVehicleLocation>(
  {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    address:     { type: String, required: true, trim: true },
    city:        { type: String, required: true, trim: true },
    state:       { type: String, required: true, trim: true },
    country:     { type: String, required: true, trim: true },
  },
  { _id: false },
);

const vehicleImageSchema = new Schema<IVehicleImage>(
  {
    url:       { type: String, required: true },
    key:       { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const documentProofSchema = new Schema<IDocumentProof>(
  {
    url:        { type: String, required: true },
    key:        { type: String, required: true },
    expiryDate: { type: Date },
    verified:   { type: Boolean, default: false },
  },
  { _id: false },
);

const vehicleDocumentsSchema = new Schema<IVehicleDocuments>(
  {
    rcBook: {
      url:      { type: String },
      key:      { type: String },
      verified: { type: Boolean, default: false },
    },
    insurance:    { type: documentProofSchema },
    pollutionCert: { type: documentProofSchema },
  },
  { _id: false },
);

const geofenceZoneSchema = new Schema<IGeofenceZone>(
  {
    type:        { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const vehicleSchema = new Schema<IVehicleDocument>(
  {
    /** Owner of this vehicle listing */
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },

    /** Listing title */
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 5,
      maxlength: 120,
    },

    /** Detailed description of the vehicle */
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    /** Vehicle type category */
    type: {
      type: String,
      enum: Object.values(VehicleType),
      required: [true, 'Vehicle type is required'],
    },

    /** Vehicle manufacturer brand */
    brand: { type: String, required: true, trim: true },

    /** Vehicle model name */
    model: { type: String, required: true, trim: true },

    /** Year of manufacture */
    year: {
      type: Number,
      required: true,
      min: 1990,
      max: new Date().getFullYear() + 1,
    },

    /** Vehicle color */
    color: { type: String, required: true, trim: true },

    /** License plate number (unique across platform) */
    licensePlate: {
      type: String,
      required: [true, 'License plate is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    /** Fuel type */
    fuelType: {
      type: String,
      enum: Object.values(FuelType),
      required: true,
    },

    /** Transmission type */
    transmission: {
      type: String,
      enum: Object.values(Transmission),
      required: true,
    },

    /** Number of seats */
    seats: { type: Number, required: true, min: 1, max: 50 },

    /** List of feature tags */
    features: [{ type: String, trim: true }],

    /** Pricing tiers */
    pricing: { type: vehiclePricingSchema, required: true },

    /** GeoJSON Point location */
    location: { type: vehicleLocationSchema, required: true },

    /** Vehicle images (up to 10) */
    images: {
      type: [vehicleImageSchema],
      validate: [(v: IVehicleImage[]) => v.length <= 10, 'Maximum 10 images allowed'],
    },

    /** Vehicle registration and insurance documents */
    documents: { type: vehicleDocumentsSchema },

    /** Approval status (managed by admin) */
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.PENDING,
    },

    /** Whether the vehicle is currently available for booking */
    isAvailable: { type: Boolean, default: true },

    /** Green/eco score (0-100) */
    greenScore: { type: Number, default: 0, min: 0, max: 100 },

    /** Badge indicating electric vehicle */
    isEVBadge: { type: Boolean, default: false },

    /** Calculated average rating from reviews */
    averageRating: { type: Number, default: 0, min: 0, max: 5 },

    /** Total number of reviews */
    totalReviews: { type: Number, default: 0 },

    /** Total number of completed bookings */
    totalBookings: { type: Number, default: 0 },

    /** Optional geofence zone (GeoJSON Polygon) */
    geofenceZone: { type: geofenceZoneSchema },

    /** Internal notes by admin */
    adminNotes: { type: String },

    /** Reason for rejection (set by admin) */
    rejectionReason: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ────────────────────────────────────────────────

vehicleSchema.index({ 'location': '2dsphere' });
vehicleSchema.index({ status: 1, isAvailable: 1 });
vehicleSchema.index({ type: 1, fuelType: 1 });
vehicleSchema.index({ title: 'text', description: 'text' });

// ─── Export ─────────────────────────────────────────────────

export const Vehicle = model<IVehicleDocument>('Vehicle', vehicleSchema);

/**
 * @sample
 * {
 *   "_id": "65a1b2c3d4e5f6789012efgh",
 *   "ownerId": "65a1b2c3d4e5f6789012abcd",
 *   "title": "Toyota Aqua 2020 — Fuel Efficient Hybrid",
 *   "description": "Well-maintained hybrid vehicle, perfect for city drives.",
 *   "type": "CAR",
 *   "brand": "Toyota",
 *   "model": "Aqua",
 *   "year": 2020,
 *   "color": "White",
 *   "licensePlate": "CAR-1234",
 *   "fuelType": "HYBRID",
 *   "transmission": "AUTOMATIC",
 *   "seats": 5,
 *   "features": ["AC", "Bluetooth", "USB Charger", "Dashcam"],
 *   "pricing": {
 *     "hourlyRate": 5, "dailyRate": 35, "weeklyRate": 200,
 *     "monthlyRate": 700, "currency": "USD", "depositAmount": 100
 *   },
 *   "location": {
 *     "type": "Point", "coordinates": [79.8612, 6.9271],
 *     "address": "123 Galle Road", "city": "Colombo",
 *     "state": "Western", "country": "Sri Lanka"
 *   },
 *   "images": [{ "url": "https://cdn.example.com/car1.jpg", "key": "car1.jpg", "isPrimary": true }],
 *   "status": "APPROVED",
 *   "isAvailable": true,
 *   "greenScore": 85,
 *   "isEVBadge": false,
 *   "averageRating": 4.5,
 *   "totalReviews": 23,
 *   "totalBookings": 45,
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 */
