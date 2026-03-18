import { Schema, model, Document, Types } from 'mongoose';

export interface ICommission extends Document {
  platformFeePercentage: number; // Base rate, e.g., 10 for 10%
  perOwnerOverrides: Array<{
    ownerId: Types.ObjectId;
    feePercentage: number;
    reason?: string;
    overrideEndsAt?: Date;
  }>;
  taxRatePercentage: number;
  effectiveFrom: Date;
  createdBy: Types.ObjectId; // Admin who set the rate
  createdAt: Date;
  updatedAt: Date;
}

const commissionSchema = new Schema<ICommission>(
  {
    platformFeePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    perOwnerOverrides: [
      {
        ownerId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        feePercentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
        reason: String,
        overrideEndsAt: Date,
      },
    ],
    taxRatePercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Commission = model<ICommission>('Commission', commissionSchema);
