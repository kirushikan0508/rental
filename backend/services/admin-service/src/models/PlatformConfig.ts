import { Schema, model, Document, Types } from 'mongoose';

export interface IPlatformConfig extends Document {
  features: {
    enableNewRegistrations: boolean;
    enableNewListings: boolean;
    enableBookings: boolean;
    maintenanceMode: boolean;
  };
  policies: {
    standardCancellationWindowHours: number;
    strictCancellationWindowHours: number;
    maxBookingDurationDays: number;
  };
  cityPricingRules: Array<{
    city: string;
    country: string;
    multiplier: number; // e.g., 1.2 for 20% surge
    surgeActive: boolean;
  }>;
  updatedBy: Types.ObjectId; // Admin
  createdAt: Date;
  updatedAt: Date;
}

const platformConfigSchema = new Schema<IPlatformConfig>(
  {
    features: {
      enableNewRegistrations: { type: Boolean, default: true },
      enableNewListings: { type: Boolean, default: true },
      enableBookings: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },
    policies: {
      standardCancellationWindowHours: { type: Number, default: 24 },
      strictCancellationWindowHours: { type: Number, default: 48 },
      maxBookingDurationDays: { type: Number, default: 30 },
    },
    cityPricingRules: [
      {
        city: { type: String, required: true },
        country: { type: String, required: true },
        multiplier: { type: Number, default: 1.0 },
        surgeActive: { type: Boolean, default: false },
      },
    ],
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformConfig = model<IPlatformConfig>('PlatformConfig', platformConfigSchema);
