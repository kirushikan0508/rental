/**
 * @file socket/index.ts
 * @description Socket.io setup for real-time booking notifications.
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { config } from '../config';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

// Map to store connected users: userId -> socketId
const userSockets = new Map<string, string>();

interface SocketUser {
  userId: string;
  role: string;
}

export function initSocketInteractions(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication Middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as SocketUser;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    
    // Store user mapping
    userSockets.set(user.userId, socket.id);
    logger.debug(`Socket connected: ${user.userId} (${socket.id})`);

    // Join a room specific to this user to receive direct events
    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${user.userId}`);
      userSockets.delete(user.userId);
    });
  });

  return io;
}

/**
 * Emits a real-time notification to a specific user.
 */
export function emitNotification(userId: string, event: string, payload: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
  logger.debug(`Emitted ${event} to user ${userId}`);
}

/**
 * Emits an event to both renter and owner (e.g. status change).
 */
export function broadcastBookingUpdate(renterId: string, ownerId: string, payload: any) {
  emitNotification(renterId, 'BOOKING_UPDATE', payload);
  emitNotification(ownerId, 'BOOKING_UPDATE', payload);
}
