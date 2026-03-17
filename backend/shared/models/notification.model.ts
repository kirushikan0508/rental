/**
 * @file notification.model.ts
 * @description Mongoose schema for the `notifications` collection.
 *
 * Stores all notifications sent to users across multiple channels
 * (push, email, SMS, WhatsApp, in-app). Supports scheduling,
 * read tracking, and auto-expiry after 90 days.
 *
 * @collection notifications
 * @indexes userId+isRead, userId+createdAt, status+scheduledAt
 * @ttl 90 days (createdAt)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum NotificationType {
  BOOKING  = 'BOOKING',
  PAYMENT  = 'PAYMENT',
  KYC      = 'KYC',
  CHAT     = 'CHAT',
  TRACKING = 'TRACKING',
  PROMO    = 'PROMO',
  SYSTEM   = 'SYSTEM',
  SOS      = 'SOS',
}

export enum NotificationChannel {
  PUSH     = 'PUSH',
  EMAIL    = 'EMAIL',
  SMS      = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP   = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT    = 'SENT',
  FAILED  = 'FAILED',
  READ    = 'READ',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  status: NotificationStatus;
  isRead: boolean;
  readAt?: Date;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDocument extends INotification, Document<Types.ObjectId> {}

// ─── Main Schema ────────────────────────────────────────────

const notificationSchema = new Schema<INotificationDocument>(
  {
    /** Target user */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    /** Notification category */
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },

    /** Notification title (shown in push / in-app header) */
    title: { type: String, required: true, maxlength: 200 },

    /** Notification body text */
    body: { type: String, required: true, maxlength: 2000 },

    /** Arbitrary metadata (e.g., bookingId, vehicleId, deep-link) */
    data: { type: Schema.Types.Mixed },

    /** Delivery channels */
    channels: [{
      type: String,
      enum: Object.values(NotificationChannel),
    }],

    /** Current delivery status */
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.PENDING,
    },

    /** Whether the user has read this notification */
    isRead: { type: Boolean, default: false },

    /** When the user read the notification */
    readAt: { type: Date },

    /** Scheduled send time (for deferred notifications) */
    scheduledAt: { type: Date },

    /** Actual send timestamp */
    sentAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledAt: 1 });

/** TTL index — auto-delete notifications after 90 days */
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ─── Export ─────────────────────────────────────────────────

export const Notification = model<INotificationDocument>('Notification', notificationSchema);

/**
 * @sample
 * {
 *   "_id": "65k12ab34ef567890ab123456",
 *   "userId": "65a1b2c3d4e5f6789012abcd",
 *   "type": "BOOKING",
 *   "title": "Booking Confirmed!",
 *   "body": "Your booking BK-M2K4A1-X7B9 for Toyota Aqua has been confirmed.",
 *   "data": { "bookingId": "65c3d4e5f6789012ab34ef01", "deepLink": "/bookings/65c3d4e5f6789012ab34ef01" },
 *   "channels": ["PUSH", "EMAIL", "IN_APP"],
 *   "status": "SENT",
 *   "isRead": false,
 *   "sentAt": "2024-01-28T14:06:00.000Z",
 *   "createdAt": "2024-01-28T14:05:30.000Z",
 *   "updatedAt": "2024-01-28T14:06:00.000Z"
 * }
 */
