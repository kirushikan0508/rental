import { Message, IMessage } from '../models/Message';

export class ModerationService {
  /**
   * Evaluates message content for policy violations (automated flagging).
   * Usually triggered before saving.
   */
  public static async evaluateAndFlag(content: string): Promise<{ isFlagged: boolean; reason?: string }> {
    // We already have a middleware, but for a centralized service logic:
    const PHONE_PATTERN = /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,15}/g;
    const EMAIL_PATTERN = /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g;

    if (PHONE_PATTERN.test(content)) return { isFlagged: true, reason: 'Contains phone number' };
    if (EMAIL_PATTERN.test(content)) return { isFlagged: true, reason: 'Contains email address' };

    // You could plug in AI sentiment analysis or bad-word filters here

    return { isFlagged: false };
  }

  /**
   * User-initiated reporting of a specific message.
   */
  public static async reportMessage(
    messageId: string,
    reporterId: string,
    reason: string
  ): Promise<IMessage | null> {
    const message = await Message.findById(messageId);
    if (!message) return null;

    // A real system would log this into a `Report` collection linking message + reporter + admin status
    // Here we'll flag the message directly for admin review
    message.isFlagged = true;
    message.flagReason = `User Reported: ${reason}`;
    
    await message.save();

    console.warn(`[MODERATION] Message ${messageId} reported by ${reporterId} for: ${reason}`);

    return message;
  }
}
