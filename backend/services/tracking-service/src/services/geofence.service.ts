import { point, polygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { GeofenceEvent } from '../models/GeofenceEvent';

// Assuming an external vehicle/booking service gives us the polygon per vehicle
// Let's type an incoming Geofence Zone
export interface GeofenceZone {
  id: string;
  vehicleId: string;
  isActive: boolean;
  coordinates: number[][][]; // Polygon geometry
}

export class GeofenceService {
  /**
   * Evaluates if a given location is inside allowed zones.
   * Emits breach events if the vehicle leaves the designated area.
   */
  public static async evaluateLocation(
    vehicleId: string,
    lat: number,
    lng: number,
    activeZones: GeofenceZone[]
  ): Promise<boolean> {
    if (!activeZones || activeZones.length === 0) {
      return true; // No active geofences, all areas allowed
    }

    const currentPoint = point([lng, lat]);
    let isInsideAnyZone = false;
    let breachedZoneId: string | undefined;

    for (const zone of activeZones) {
      if (!zone.isActive) continue;

      try {
        const poly = polygon(zone.coordinates);
        const inside = booleanPointInPolygon(currentPoint, poly);
        
        if (inside) {
          isInsideAnyZone = true;
          break; // It's inside at least one allowed zone
        } else {
          breachedZoneId = zone.id;
        }
      } catch (err) {
        console.error('Geofence evaluation error:', err);
      }
    }

    if (!isInsideAnyZone && breachedZoneId) {
      // Vehicle exited geofence
      await this.handleBreach(vehicleId, breachedZoneId, lat, lng);
      return false;
    }

    return true;
  }

  private static async handleBreach(
    vehicleId: string, 
    zoneId: string, 
    lat: number, 
    lng: number
  ): Promise<void> {
    // 1. Log breach event to database
    await GeofenceEvent.create({
      vehicleId,
      zoneId,
      eventType: 'EXIT',
      location: { type: 'Point', coordinates: [lng, lat] }
    });

    // 2. The AlertService or Socket handler will observe this and emit notifications
    // We will emit via AlertService or direct Socket trigger later.
    console.warn(`[GEOFENCE BREACH] Vehicle ${vehicleId} exited zone ${zoneId} at [${lat}, ${lng}]`);
  }
}
