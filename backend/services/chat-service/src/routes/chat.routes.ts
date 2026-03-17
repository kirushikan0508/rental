import { Router } from 'express';
// import { authenticate } from '../middleware/auth'; // Placeholder for auth middleware
import { chatController } from '../controllers/chat.controller';
import { ContentFilterMiddleware } from '../middleware/content-filter';

const router = Router();

// Retrieve all active conversations for the user
router.get('/conversations', chatController.getUserConversations);

// Retrieve messages for a specific conversation
router.get('/:conversationId/messages', chatController.getMessages);

// Report a message
router.post('/report', chatController.reportMessage);

// Initiate proxy call between renter and owner
router.post('/call', chatController.initiateCall);

export default router;
