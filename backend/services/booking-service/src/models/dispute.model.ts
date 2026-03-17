/**
 * @file models/dispute.model.ts
 * @description Damage dispute model with evidence and admin resolution.
 */

import mongoose, { Schema, Document } from 'mongoose';

export const DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED_RENTER: 'RESOLVED_RENTER',
  RESOLVED_OWNER: 'RESOLVED_OWNER',
  CLOSED: 'CLOSED',
} as const;
export type DisputeStatusType = typeof DisputeStatus[keyof typeof DisputeStatus];

export interface IDispute extends Document {
  bookingId: string;
  vehicleId: string;
  raisedBy: string;
  raisedByRole: 'RENTER' | 'OWNER';
  status: DisputeStatusType;
  description: string;
  evidence: { url: string; description?: string; uploadedAt: Date }[];
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  compensationAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    bookingId: { type: String, required: true, index: true },
    vehicleId: { type: String, required: true },
    raisedBy: { type: String, required: true },
    raisedByRole: { type: String, enum: ['RENTER', 'OWNER'], required: true },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    description: { type: String, required: true },
    evidence: [
      {
        url: { type: String, required: true },
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    resolution: String,
    resolvedBy: String,
    resolvedAt: Date,
    compensationAmount: Number,
  },
  { timestamps: true },
);

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);
