import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisClient } from '../utils/redis';
import { ChatService } from '../services/chat.service';
import { ModerationService } from '../services/moderation.service';
import { checkContentViolations } from '../middleware/content-filter';

export let io: Server;

export const initializeSocket = async (httpServer: HttpServer): Promise<Server> => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Authentication Middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const payload = jwt.verify(token.replace('Bearer ', ''), secret) as any;
      socket.data.user = payload; 
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.id || 'unknown';
    console.log(`[Chat Socket] Client connected: ${socket.id} (User: ${userId})`);

    // User joins a room specific to their conversation or their user ID
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conv_${conversationId}`);
      console.log(`[Chat Socket] User ${userId} joined conversation ${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conv_${conversationId}`).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conv_${conversationId}`).emit('typing:stop', { userId, conversationId });
    });
    
    // Sender dispatches a new message
    socket.on('message:send', async (data: { conversationId: string; receiverId: string; content: string; type: 'TEXT' | 'IMAGE' }) => {
      try {
        const { conversationId, receiverId, content, type } = data;
        
        // 1. Check Moderation & Filters before saving
        const filterCheck = checkContentViolations(content);
        if (!filterCheck.isClean) {
          // Alert the sender only that their message was blocked
          socket.emit('message:blocked', { error: 'Your message contained blocked contact details or links.' });
          return;
        }

        const moderation = await ModerationService.evaluateAndFlag(content);

        // 2. Save to database
        const savedMessage = await ChatService.saveMessage(
          conversationId,
          userId,
          receiverId,
          content,
          type,
          moderation.isFlagged,
          moderation.reason
        );

        // 3. Broadcast delivery to all clients in conversation
        io.to(`conv_${conversationId}`).emit('message:delivered', savedMessage);
        
        // You would typically ping the Notification Service here via queue to handle push notifications
        // e.g. RabbitMQ.publish('notifications', { userId: receiverId, type: 'NEW_MESSAGE', data: savedMessage });
      } catch (err: any) {
        console.error('Socket message:send error:', err);
      }
    });

    // Explicit read receipt marker
    socket.on('message:read', async (data: { messageId?: string, conversationId: string }) => {
      // In real implementation, validate auth and mark DB as read via ChatService
      await ChatService.markMessagesAsRead(data.conversationId, userId, data.messageId);

      socket.to(`conv_${data.conversationId}`).emit('message:read', {
        messageId: data.messageId,
        readBy: userId,
        readAt: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Chat Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
