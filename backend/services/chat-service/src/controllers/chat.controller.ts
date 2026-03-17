import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { ChatService } from '../services/chat.service';
import { ModerationService } from '../services/moderation.service';
import { TwilioService } from '../services/twilio.service';

/**
 * Controller for fetching chat history, reporting messages, and proxy calling.
 */
export const chatController = {
  
  /**
   * GET /chat/conversations
   * Fetch all active conversations for the authenticated user
   */
  async getUserConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'mock_user_id';
      
      const conversations = await Conversation.find({ participants: userId })
        .sort({ lastMessageAt: -1 })
        .limit(20);

      res.status(200).json({ success: true, data: conversations });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * GET /chat/:conversationId/messages
   * Fetch paginated messages for a specific conversation
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      // Ensure user is part of the conversation
      const userId = (req as any).user?.id || 'mock_user_id';
      const conv = await Conversation.findById(conversationId);

      if (!conv || !conv.participants.includes(userId)) {
        res.status(403).json({ success: false, error: 'Access denied to this conversation' });
        return;
      }

      const messages = await ChatService.getMessages(conversationId, limit, skip);

      res.status(200).json({ success: true, data: messages });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * POST /chat/report
   * Report a specific message for moderation
   */
  async reportMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId, reason } = req.body;
      const reporterId = (req as any).user?.id || 'mock_reporter_id';

      if (!messageId || !reason) {
        res.status(400).json({ success: false, error: 'MessageId and reason are required.' });
        return;
      }

      const reportedMsg = await ModerationService.reportMessage(messageId, reporterId, reason);

      if (!reportedMsg) {
        res.status(404).json({ success: false, error: 'Message not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Message reported successfully. Our team will review it.' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * POST /chat/call
   * Initiate a proxy call between renter and owner
   */
  async initiateCall(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId, targetPhone, userPhone } = req.body;

      if (!bookingId || !targetPhone || !userPhone) {
        res.status(400).json({ success: false, error: 'Booking ID and both phone numbers are required.' });
        return;
      }

      // Check if user has permission to call based on active booking status...
      
      const callSid = await TwilioService.initiateMaskedCall(userPhone, targetPhone, bookingId);

      res.status(200).json({ success: true, message: 'Call initiated', callSid });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
  }
};
