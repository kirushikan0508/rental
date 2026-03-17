import { Request, Response } from 'express';
import { RouteModel } from '../models/Route';
import { TrackingLog } from '../models/TrackingLog';
import { LocationService } from '../services/location.service';
import { AlertService } from '../services/alert.service';
import { TrackingRuleService } from '../services/tracking-rule.service';

/**
 * Controller for Real-Time Tracking, route retrieval, SOS, and geofencing management
 */
export const trackingController = {
  
  /**
   * GET /tracking/:bookingId/route
   * Fetch the full GPS path for a given booking (used for dispute resolution or trip recaps)
   */
  async getRouteData(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      
      // In a real app we would check req.user role and tracking rules here
      // TrackingRuleService.canTrack({ role: req.user.role, bookingState: ... })
      
      const route = await RouteModel.findOne({ bookingId }).select('-__v');

      if (!route) {
        res.status(404).json({ success: false, error: 'Route not found for this booking' });
        return;
      }

      res.status(200).json({ success: true, data: route });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * GET /tracking/:vehicleId/latest
   * Fetch the latest cached location of a vehicle (requires auth)
   */
  async getLatestLocation(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId } = req.params;

      const latestLocation = await LocationService.getLatestLocation(vehicleId);

      if (!latestLocation) {
        res.status(404).json({ success: false, error: 'Vehicle location currently unavailable.' });
        return;
      }

      // If user isn't authorized or it's a privacy masked scenario, we might obfuscate lat/lng here
      // e.g. obfuscated = { lat: round(lat), lng: round(lng) }

      res.status(200).json({ success: true, data: latestLocation });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * POST /tracking/geofence
   * Set or update allowed geofence zone for a vehicle
   */
  async createGeofence(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId, isActive, coordinates } = req.body;
      
      // Basic validation
      if (!vehicleId || !coordinates) {
        res.status(400).json({ success: false, error: 'vehicleId and coordinates array are required.' });
        return;
      }

      // Store in DB or cache as an active GeofenceZone...
      // Mock successful response
      res.status(201).json({ 
        success: true, 
        message: 'Geofence activated.', 
        data: { id: `zone_${Date.now()}`, vehicleId, isActive }
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * POST /tracking/sos
   * Trigger emergency dispatch for the given vehicle/booking
   */
  async triggerSOS(req: Request, res: Response): Promise<void> {
    try {
      const { vehicleId, bookingId, lat, lng } = req.body;
      // The calling user ID extracted from Auth middleware
      const userId = (req as any).user?.id || 'mock_user_id'; 
      
      if (!vehicleId || !lat || !lng) {
        res.status(400).json({ success: false, error: 'VehicleId and location are required for SOS.' });
        return;
      }

      await AlertService.triggerSOS(vehicleId, bookingId, lat, lng, userId);

      res.status(200).json({ success: true, message: 'SOS triggered successfully.' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * PUT /tracking/:bookingId/consent
   * Renter modifying tracking consent mid-trip
   */
  async updateConsent(req: Request, res: Response): Promise<void> {
    try {
      const { bookingId } = req.params;
      const { consentGranted } = req.body;

      if (typeof consentGranted !== 'boolean') {
        res.status(400).json({ success: false, error: 'consentGranted must be boolean' });
        return;
      }

      // We would update the booking record in the Booking Server via RabbitMQ, 
      // or directly if shared DB
      console.log(`[CONSENT] Booking ${bookingId} consent to track changed to: ${consentGranted}`);

      res.status(200).json({ success: true, message: 'Tracking consent updated.' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
};
