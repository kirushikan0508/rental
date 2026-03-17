import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  bookingId: string;
  participants: [string, string]; // [renterId, ownerId]
  lastMessageAt: Date;
  status: 'ACTIVE' | 'ARCHIVED' | 'BLOCKED';
}

const ConversationSchema: Schema = new Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true, // One conversation per booking
    },
    participants: {
      type: [String],
      required: true,
      validate: [
        (val: string[]) => val.length === 2,
        '{PATH} must have exactly 2 participants',
      ],
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'BLOCKED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// Indexes for faster lookups based on user's active conversations
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
ConversationSchema.index({ bookingId: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
