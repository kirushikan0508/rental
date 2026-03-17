import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisClient } from '../utils/redis';
import { LocationService } from '../services/location.service';
import { GeofenceService, GeofenceZone } from '../services/geofence.service';

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
      // Secret should match auth service
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      
      const payload = jwt.verify(token.replace('Bearer ', ''), secret) as any;
      socket.data.user = payload; // Attach user payload to socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user?.id || 'unknown';
    const userRole = socket.data.user?.role || 'RENTER';
    console.log(`[Socket.io] Client connected: ${socket.id} (User: ${userId}, Role: ${userRole})`);

    // Subscribe to a vehicle's tracking updates (For Renters/Owners/Admins)
    socket.on('subscribe:vehicle', (vehicleId: string) => {
      // Check TrackingRuleService.canTrack() before allowing join in real app
      // Assuming success:
      const room = `vehicle_${vehicleId}`;
      socket.join(room);
      console.log(`[Socket.io] User ${userId} joined room ${room}`);
    });

    // Unsubscribe
    socket.on('unsubscribe:vehicle', (vehicleId: string) => {
      const room = `vehicle_${vehicleId}`;
      socket.leave(room);
      console.log(`[Socket.io] User ${userId} left room ${room}`);
    });

    // Vehicle pushing its location
    socket.on('location:update', async (data: { vehicleId: string; bookingId?: string; lat: number; lng: number; speed?: number; heading?: number }) => {
      try {
        const { vehicleId, bookingId, lat, lng, speed, heading } = data;
        
        // 1. Process location internally (Cache + Archiving Queue)
        await LocationService.updateLocation({
          vehicleId,
          bookingId,
          lat,
          lng,
          speed,
          heading,
          timestamp: Date.now()
        });

        // 2. Broadcast to authorized clients tracking this vehicle
        io.to(`vehicle_${vehicleId}`).emit('location:changed', {
          vehicleId,
          lat,
          lng,
          speed,
          heading,
          timestamp: new Date().toISOString()
        });

        // 3. Evaluate Geofence Context
        // Mock activeZones retrieval
        const activeZones: GeofenceZone[] = []; 
        const isInside = await GeofenceService.evaluateLocation(vehicleId, lat, lng, activeZones);
        if (!isInside) {
          // Emit geofence breach event to owners/admin specifically
          io.to(`vehicle_${vehicleId}_owner`).emit('geofence:breach', {
            vehicleId,
            message: 'Vehicle has exited the allowed zone!',
            lat,
            lng
          });
        }
      } catch (err) {
        console.error('Socket location:update error:', err);
      }
    });

    // Event emitted by Booking Service when trip ends to disable tracking
    socket.on('booking:end', (data: { vehicleId: string }) => {
      const room = `vehicle_${data.vehicleId}`;
      // Tell clients that tracking is now disabled
      io.to(room).emit('tracking:disabled', { 
        vehicleId: data.vehicleId, 
        message: 'Booking has ended. Tracking disabled.' 
      });
      console.log(`[Socket.io] Tracking disabled emitted for vehicle ${data.vehicleId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
