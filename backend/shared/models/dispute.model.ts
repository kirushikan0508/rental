/**
 * @file dispute.model.ts
 * @description Mongoose schema for the `disputes` collection.
 *
 * Tracks disputes raised between renters and owners after a booking.
 * Supports damage claims, payment issues, behaviour complaints,
 * evidence uploads, admin assignment, and resolution timeline.
 *
 * @collection disputes
 * @indexes bookingId, raisedBy+status, assignedAdmin+status, disputeRef(unique)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum DisputeType {
  DAMAGE    = 'DAMAGE',
  PAYMENT   = 'PAYMENT',
  BEHAVIOUR = 'BEHAVIOUR',
  OTHER     = 'OTHER',
}

export enum DisputeStatus {
  OPEN         = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED     = 'RESOLVED',
  CLOSED       = 'CLOSED',
  ESCALATED    = 'ESCALATED',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IEvidence {
  url: string;
  key: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IResolution {
  decision: string;
  notes: string;
  resolvedBy: Types.ObjectId;
  refundAmount: number;
  resolvedAt: Date;
}

export interface ITimelineEntry {
  action: string;
  performedBy: Types.ObjectId;
  note: string;
  at: Date;
}

export interface IDispute {
  disputeRef: string;
  bookingId: Types.ObjectId;
  raisedBy: Types.ObjectId;
  againstUser: Types.ObjectId;
  type: DisputeType;
  description: string;
  evidence: IEvidence[];
  status: DisputeStatus;
  resolution?: IResolution;
  assignedAdmin?: Types.ObjectId;
  timeline: ITimelineEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDisputeDocument extends IDispute, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const evidenceSchema = new Schema<IEvidence>(
  {
    url:        { type: String, required: true },
    key:        { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false },
);

const resolutionSchema = new Schema<IResolution>(
  {
    decision:     { type: String, required: true },
    notes:        { type: String },
    resolvedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refundAmount: { type: Number, default: 0, min: 0 },
    resolvedAt:   { type: Date, required: true },
  },
  { _id: false },
);

const timelineEntrySchema = new Schema<ITimelineEntry>(
  {
    action:      { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note:        { type: String },
    at:          { type: Date, required: true },
  },
  { _id: false },
);

// ─── Utility ────────────────────────────────────────────────

function generateDisputeRef(): string {
  const prefix = 'DSP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Main Schema ────────────────────────────────────────────

const disputeSchema = new Schema<IDisputeDocument>(
  {
    /** Auto-generated unique dispute reference */
    disputeRef: {
      type: String,
      unique: true,
      default: generateDisputeRef,
    },

    /** Associated booking */
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },

    /** User who raised the dispute */
    raisedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'RaisedBy user ID is required'],
    },

    /** User the dispute is against */
    againstUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'AgainstUser ID is required'],
    },

    /** Type/category of dispute */
    type: {
      type: String,
      enum: Object.values(DisputeType),
      required: true,
    },

    /** Detailed description of the dispute */
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: 5000,
    },

    /** Supporting evidence (images, documents) */
    evidence: [evidenceSchema],

    /** Current dispute status */
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
    },

    /** Resolution details (populated when resolved) */
    resolution: { type: resolutionSchema },

    /** Admin assigned to review the dispute */
    assignedAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    /** Chronological timeline of actions taken */
    timeline: [timelineEntrySchema],
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

disputeSchema.index({ raisedBy: 1, status: 1 });
disputeSchema.index({ assignedAdmin: 1, status: 1 });

// ─── Export ─────────────────────────────────────────────────

export const Dispute = model<IDisputeDocument>('Dispute', disputeSchema);

/**
 * @sample
 * {
 *   "_id": "65i9012ab34ef567890ab1234",
 *   "disputeRef": "DSP-M2K6C3-Y9S4",
 *   "bookingId": "65c3d4e5f6789012ab34ef01",
 *   "raisedBy": "65a1b2c3d4e5f6789012abcd",
 *   "againstUser": "65a1b2c3d4e5f6789012wxyz",
 *   "type": "DAMAGE",
 *   "description": "Found a scratch on the left door that was not there before.",
 *   "evidence": [
 *     { "url": "https://cdn.example.com/scratch.jpg", "key": "scratch.jpg",
 *       "uploadedBy": "65a1b2c3d4e5f6789012abcd", "uploadedAt": "2024-02-04T09:00:00.000Z" }
 *   ],
 *   "status": "UNDER_REVIEW",
 *   "assignedAdmin": "65a1b2c3d4e5f6789012admin",
 *   "timeline": [
 *     { "action": "DISPUTE_OPENED", "performedBy": "65a1b2c3d4e5f6789012abcd",
 *       "note": "Dispute raised", "at": "2024-02-04T09:00:00.000Z" },
 *     { "action": "ASSIGNED_TO_ADMIN", "performedBy": "system",
 *       "note": "Auto-assigned to admin", "at": "2024-02-04T09:01:00.000Z" }
 *   ],
 *   "createdAt": "2024-02-04T09:00:00.000Z",
 *   "updatedAt": "2024-02-04T09:01:00.000Z"
 * }
 */
