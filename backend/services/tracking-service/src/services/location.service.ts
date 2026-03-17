import { redisClient } from '../utils/redis';
import { TrackingLog } from '../models/TrackingLog';
import { RouteModel, IRoutePoint } from '../models/Route';

export interface LocationData {
  vehicleId: string;
  bookingId?: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number; // Unix timestamp
}

export class LocationService {
  private static CACHE_PREFIX = 'vehicle:loc:';
  private static ROUTE_CACHE_PREFIX = 'vehicle:route:';
  
  /**
   * Update the live location of a vehicle in Redis and queue for DB storage
   */
  public static async updateLocation(data: LocationData): Promise<void> {
    const key = `${this.CACHE_PREFIX}${data.vehicleId}`;
    
    // 1. Cache the latest location in Redis (Fast access)
    // Overwrite the existing coordinate
    await redisClient.set(key, JSON.stringify({
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      heading: data.heading,
      timestamp: data.timestamp,
    }));

    // Optional TTL for live tracking so stale coordinates drop out
    await redisClient.expire(key, 60 * 60); // 1 hour

    // 2. Add point to a Redis List for batch archiving (to avoid overwhelming MongoDB)
    const routeKey = `${this.ROUTE_CACHE_PREFIX}${data.vehicleId}`;
    await redisClient.rpush(routeKey, JSON.stringify(data));
  }

  /**
   * Get the latest known location of a vehicle from cache
   */
  public static async getLatestLocation(vehicleId: string): Promise<LocationData | null> {
    const key = `${this.CACHE_PREFIX}${vehicleId}`;
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as LocationData;
  }

  /**
   * Worker method to run periodically (e.g. every 60s) to flush Redis locations to MongoDB
   * In a real system, you'd use BullMQ or a separate worker process.
   */
  public static async archiveBatchLocations(vehicleIds: string[]): Promise<void> {
    for (const vid of vehicleIds) {
      const routeKey = `${this.ROUTE_CACHE_PREFIX}${vid}`;
      
      // Pull all current cached points
      const pointsData = await redisClient.lrange(routeKey, 0, -1);
      if (!pointsData || pointsData.length === 0) continue;

      // Clear the processed points
      await redisClient.ltrim(routeKey, pointsData.length, -1);

      const logsToInsert: any[] = [];
      const points: IRoutePoint[] = [];
      let bookingIdForRoute: string | undefined;

      for (const ptStr of pointsData) {
        const pt = JSON.parse(ptStr) as LocationData;
        const ptDate = new Date(pt.timestamp);

        logsToInsert.push({
          vehicleId: pt.vehicleId,
          bookingId: pt.bookingId,
          location: { type: 'Point', coordinates: [pt.lng, pt.lat] },
          speed: pt.speed || 0,
          heading: pt.heading || 0,
          timestamp: ptDate,
        });

        points.push({
          coordinates: [pt.lng, pt.lat],
          timestamp: ptDate,
          speed: pt.speed || 0,
        });

        if (!bookingIdForRoute && pt.bookingId) {
          bookingIdForRoute = pt.bookingId;
        }
      }

      // 1. Insert into TrackingLog collection (raw GPS data)
      if (logsToInsert.length > 0) {
        await TrackingLog.insertMany(logsToInsert, { ordered: false }).catch((err) => {
           console.error('Batch TrackingLog Insert Error:', err);
        });
      }

      // 2. Append to Route document if tied to an active booking
      if (bookingIdForRoute) {
        await RouteModel.findOneAndUpdate(
          { bookingId: bookingIdForRoute, vehicleId: vid },
          { 
            $push: { points: { $each: points } },
            $setOnInsert: { startTime: new Date() }
          },
          { upsert: true, new: true }
        ).catch((err) => {
           console.error('Route Point Append Error:', err);
        });
      }
    }
  }
}
