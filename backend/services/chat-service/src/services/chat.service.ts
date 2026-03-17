import { Conversation, IConversation } from '../models/Conversation';
import { Message, IMessage } from '../models/Message';

export class ChatService {
  /**
   * Retrieves or initializes a conversation between two users for a specific booking.
   */
  public static async getOrCreateConversation(
    bookingId: string,
    renterId: string,
    ownerId: string
  ): Promise<IConversation> {
    let conversation = await Conversation.findOne({ bookingId });

    if (!conversation) {
      conversation = await Conversation.create({
        bookingId,
        participants: [renterId, ownerId],
        status: 'ACTIVE'
      });
    }

    return conversation;
  }

  /**
   * Fetch paginated messages for a conversation
   */
  public static async getMessages(
    conversationId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<IMessage[]> {
    return Message.find({ conversationId })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit);
  }

  /**
   * Save a new message securely.
   */
  public static async saveMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    type: 'TEXT' | 'IMAGE' | 'SYSTEM' = 'TEXT',
    isFlagged: boolean = false,
    flagReason?: string
  ): Promise<IMessage> {
    const msg = await Message.create({
      conversationId,
      senderId,
      receiverId,
      content,
      type,
      status: 'SENT',
      isFlagged,
      flagReason
    });

    // Update the conversation's lastMessageAt timestamp for sorting conversation lists
    await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

    return msg;
  }

  /**
   * Mark a message or all conversation messages as READ
   */
  public static async markMessagesAsRead(
    conversationId: string,
    readerId: string,
    messageId?: string
  ): Promise<void> {
    const query: any = { conversationId, receiverId: readerId, status: { $ne: 'READ' } };
    
    // If a specific message is given, mark only that and everything before it as read chronologically
    if (messageId) {
      query._id = messageId;
    }

    await Message.updateMany(query, {
      $set: { status: 'READ', readAt: new Date() }
    });
  }
}
