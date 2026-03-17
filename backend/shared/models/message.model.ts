/**
 * @file message.model.ts
 * @description Mongoose schema for the `messages` collection.
 *
 * Stores individual chat messages within a conversation. Supports
 * text, image, and system messages with delivery status tracking,
 * content filtering, and reporting.
 *
 * @collection messages
 * @indexes conversationId+createdAt, senderId, bookingId, isReported
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum MessageType {
  TEXT   = 'TEXT',
  IMAGE  = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export enum MessageStatus {
  SENT      = 'SENT',
  DELIVERED = 'DELIVERED',
  READ      = 'READ',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IMessage {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  bookingId: Types.ObjectId;
  type: MessageType;
  content: string;
  imageUrl?: string;
  status: MessageStatus;
  isFiltered: boolean;
  filteredReason?: string;
  isReported: boolean;
  reportedBy?: Types.ObjectId;
  reportReason?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageDocument extends IMessage, Document<Types.ObjectId> {}

// ─── Main Schema ────────────────────────────────────────────

const messageSchema = new Schema<IMessageDocument>(
  {
    /** Parent conversation */
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
    },

    /** User who sent the message */
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },

    /** User who receives the message */
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
    },

    /** Associated booking */
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      index: true,
    },

    /** Message type */
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },

    /** Message content (text body or system message) */
    content: {
      type: String,
      required: function (this: IMessageDocument) {
        return this.type !== MessageType.IMAGE;
      },
      maxlength: 5000,
    },

    /** Image URL (for IMAGE type messages) */
    imageUrl: { type: String },

    /** Delivery status */
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.SENT,
    },

    /** Whether content was auto-filtered for inappropriate language */
    isFiltered: { type: Boolean, default: false },

    /** Reason the message was filtered */
    filteredReason: { type: String },

    /** Whether the message has been reported */
    isReported: { type: Boolean, default: false, index: true },

    /** User who reported the message */
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    /** Reason for the report */
    reportReason: { type: String },

    /** Soft delete timestamp */
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

messageSchema.index({ conversationId: 1, createdAt: 1 });

// ─── Export ─────────────────────────────────────────────────

export const Message = model<IMessageDocument>('Message', messageSchema);

/**
 * @sample
 * {
 *   "_id": "65f6789012ab34ef56789012",
 *   "conversationId": "65f0123456789012ab34ef56",
 *   "senderId": "65a1b2c3d4e5f6789012abcd",
 *   "receiverId": "65a1b2c3d4e5f6789012wxyz",
 *   "bookingId": "65c3d4e5f6789012ab34ef01",
 *   "type": "TEXT",
 *   "content": "Hi, is the car available for pickup at 9 AM?",
 *   "status": "DELIVERED",
 *   "isFiltered": false,
 *   "isReported": false,
 *   "createdAt": "2024-01-30T08:00:00.000Z",
 *   "updatedAt": "2024-01-30T08:00:05.000Z"
 * }
 */
