import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'SYSTEM';
  status: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: Date;
  deliveredAt?: Date;
  isFlagged: boolean; // True if it contains blocked content/reported
  flagReason?: string;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    receiverId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'SYSTEM'],
      default: 'TEXT',
    },
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'READ'],
      default: 'SENT',
    },
    readAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index to quickly fetch recent messages for a conversation
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, receiverId: 1 }); // For querying message counts between peers

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
