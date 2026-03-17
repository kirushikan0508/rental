import mongoose, { Schema, Document } from 'mongoose';

export interface IRoutePoint {
  coordinates: [number, number]; // [longitude, latitude]
  timestamp: Date;
  speed: number;
}

export interface IRoute extends Document {
  bookingId: string;
  vehicleId: string;
  points: IRoutePoint[];
  startTime: Date;
  endTime?: Date;
  distanceKm?: number;
}

const RoutePointSchema = new Schema(
  {
    coordinates: {
      type: [Number],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    speed: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const RouteSchema: Schema = new Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    vehicleId: {
      type: String,
      required: true,
      index: true,
    },
    points: [RoutePointSchema],
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    distanceKm: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// TTL Index: Automatically purge Routes after 30 days, using startTime or updated timestamps
RouteSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const RouteModel = mongoose.model<IRoute>('Route', RouteSchema);
