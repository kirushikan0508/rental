import mongoose, { Schema, Document } from 'mongoose';

export interface ITrackingLog extends Document {
  vehicleId: string;
  bookingId?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  speed?: number;
  heading?: number;
  timestamp: Date;
}

const TrackingLogSchema: Schema = new Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      index: true,
    },
    bookingId: {
      type: String,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    speed: {
      type: Number,
      default: 0,
    },
    heading: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true, // Useful for querying recent points
    },
  },
  { timestamps: true }
);

// GeoJSON index for spatial queries
TrackingLogSchema.index({ location: '2dsphere' });

// TTL Index: Automatically purge logs after 30 days
TrackingLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const TrackingLog = mongoose.model<ITrackingLog>('TrackingLog', TrackingLogSchema);
