/**
 * @file models/inspection.model.ts
 * @description Pre/post rental inspection photos for dispute evidence.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IInspection extends Document {
  bookingId: string;
  vehicleId: string;
  type: 'PRE_RENTAL' | 'POST_RENTAL';
  photos: { url: string; description?: string; uploadedAt: Date }[];
  notes?: string;
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inspectionSchema = new Schema<IInspection>(
  {
    bookingId: { type: String, required: true, index: true },
    vehicleId: { type: String, required: true },
    type: { type: String, enum: ['PRE_RENTAL', 'POST_RENTAL'], required: true },
    photos: [
      {
        url: { type: String, required: true },
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

inspectionSchema.index({ bookingId: 1, type: 1 }, { unique: true });

export const Inspection = mongoose.model<IInspection>('Inspection', inspectionSchema);
