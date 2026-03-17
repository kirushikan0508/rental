import { Router } from 'express';
import { trackingController } from '../controllers/tracking.controller';

const router = Router();

// Routes mapped to Tracking Controller

// GET /api/v1/tracking/:bookingId/route - Retrieve historical complete track
router.get('/:bookingId/route', trackingController.getRouteData);

// GET /api/v1/tracking/:vehicleId/latest - Retrieve the latest known live coordinate
router.get('/:vehicleId/latest', trackingController.getLatestLocation);

// POST /api/v1/tracking/geofence - Set allowed zone bounding box/polygon
router.post('/geofence', trackingController.createGeofence);

// POST /api/v1/tracking/sos - Emit emergency trigger
router.post('/sos', trackingController.triggerSOS);

// PUT /api/v1/tracking/:bookingId/consent - Mid-flight consent modification
router.put('/:bookingId/consent', trackingController.updateConsent);

export default router;
