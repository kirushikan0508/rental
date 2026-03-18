import { Schema, model, Document, Types } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  targetRole: 'all' | 'renter' | 'owner';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  scheduledFor?: Date;
  publishedAt?: Date;
  createdBy: Types.ObjectId; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    targetRole: {
      type: String,
      enum: ['all', 'renter', 'owner'],
      default: 'all',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    scheduledFor: Date,
    publishedAt: Date,
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

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);
