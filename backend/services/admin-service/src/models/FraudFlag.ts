import { Schema, model, Document, Types } from 'mongoose';

export interface IFraudFlag extends Document {
  targetType: 'User' | 'Vehicle' | 'Booking';
  targetId: Types.ObjectId;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  reportedBy?: Types.ObjectId; // System or specific Admin ID
  metadata?: Record<string, any>;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const fraudFlagSchema = new Schema<IFraudFlag>(
  {
    targetType: {
      type: String,
      enum: ['User', 'Vehicle', 'Booking'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'dismissed'],
      default: 'open',
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    resolvedAt: Date,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolutionNotes: String,
  },
  {
    timestamps: true,
  }
);

export const FraudFlag = model<IFraudFlag>('FraudFlag', fraudFlagSchema);
