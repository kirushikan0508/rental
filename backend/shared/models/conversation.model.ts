/**
 * @file conversation.model.ts
 * @description Mongoose schema for the `conversations` collection.
 *
 * Groups messages between two users for a specific booking.
 * Tracks unread counts, last message preview, and blocking.
 *
 * @collection conversations
 * @indexes bookingId(unique), participants, updatedAt
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────

export interface ILastMessage {
  content: string;
  senderId: Types.ObjectId;
  sentAt: Date;
}

export interface IUnreadCount {
  userId: Types.ObjectId;
  count: number;
}

export interface IConversation {
  bookingId: Types.ObjectId;
  participants: Types.ObjectId[];
  lastMessage?: ILastMessage;
  unreadCount: IUnreadCount[];
  isBlocked: boolean;
  blockedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationDocument extends IConversation, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const lastMessageSchema = new Schema<ILastMessage>(
  {
    content:  { type: String },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    sentAt:   { type: Date },
  },
  { _id: false },
);

const unreadCountSchema = new Schema<IUnreadCount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    count:  { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const conversationSchema = new Schema<IConversationDocument>(
  {
    /** Associated booking (one conversation per booking) */
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true,
    },

    /** Participant user IDs (renter + owner) */
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],

    /** Preview of the last message sent */
    lastMessage: { type: lastMessageSchema },

    /** Unread message counts per participant */
    unreadCount: [unreadCountSchema],

    /** Whether the conversation is blocked */
    isBlocked: { type: Boolean, default: false },

    /** User who blocked the conversation */
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// ─── Export ─────────────────────────────────────────────────

export const Conversation = model<IConversationDocument>('Conversation', conversationSchema);

/**
 * @sample
 * {
 *   "_id": "65f0123456789012ab34ef56",
 *   "bookingId": "65c3d4e5f6789012ab34ef01",
 *   "participants": ["65a1b2c3d4e5f6789012abcd", "65a1b2c3d4e5f6789012wxyz"],
 *   "lastMessage": {
 *     "content": "Sure, 9 AM works. See you then!",
 *     "senderId": "65a1b2c3d4e5f6789012wxyz",
 *     "sentAt": "2024-01-30T08:05:00.000Z"
 *   },
 *   "unreadCount": [
 *     { "userId": "65a1b2c3d4e5f6789012abcd", "count": 1 },
 *     { "userId": "65a1b2c3d4e5f6789012wxyz", "count": 0 }
 *   ],
 *   "isBlocked": false,
 *   "createdAt": "2024-01-29T12:00:00.000Z",
 *   "updatedAt": "2024-01-30T08:05:00.000Z"
 * }
 */
