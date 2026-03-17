import mongoose, { Schema, Document } from 'mongoose';

export interface IGeofenceEvent extends Document {
  vehicleId: string;
  zoneId?: string;
  eventType: 'ENTER' | 'EXIT';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  timestamp: Date;
}

const GeofenceEventSchema: Schema = new Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      index: true,
    },
    zoneId: {
      type: String,
    },
    eventType: {
      type: String,
      enum: ['ENTER', 'EXIT'],
      required: true,
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
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

GeofenceEventSchema.index({ location: '2dsphere' });

export const GeofenceEvent = mongoose.model<IGeofenceEvent>('GeofenceEvent', GeofenceEventSchema);
