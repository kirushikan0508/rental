/**
 * @file routes/vehicle.routes.ts
 * @description All vehicle-service routes organized by domain.
 *
 * Route Groups:
 *   Public    — search, get by ID/slug, availability check, recommendations
 *   Owner     — CRUD, images, documents, availability management
 *   Admin     — approve, reject, flag, list all
 *   Internal  — block/unblock dates for bookings
 */

import { Router } from 'express';
import * as ctrl from '../controllers/vehicle.controller';
import { authenticate, authorize, validate, validateQuery, imageUpload, documentUpload } from '../middleware';
import {
  createVehicleSchema,
  updateVehicleSchema,
  setAvailabilitySchema,
  searchQuerySchema,
  adminActionSchema,
  adminListSchema,
  blockDatesSchema,
} from '../validators/vehicle.validator';

const router = Router();

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════

/** @route GET /vehicles/search — Search vehicles (Elasticsearch) */
router.get('/search', validateQuery(searchQuerySchema), ctrl.searchVehicles);

/** @route GET /vehicles/slug/:slug — Get vehicle by slug */
router.get('/slug/:slug', ctrl.getVehicleBySlug);

/** @route GET /vehicles/owner/:ownerId — List owner's vehicles */
router.get('/owner/:ownerId', ctrl.getOwnerVehicles);

/** @route GET /vehicles/:id — Get vehicle by ID */
router.get('/:id', ctrl.getVehicle);

/** @route GET /vehicles/:id/availability — Check availability */
router.get('/:id/availability', ctrl.checkAvailability);

/** @route GET /vehicles/:id/calendar — Get full calendar */
router.get('/:id/calendar', ctrl.getCalendar);

/** @route GET /vehicles/:id/recommendations — AI recommendations */
router.get('/:id/recommendations', ctrl.getRecommendations);

// ═══════════════════════════════════════════════════════════
// OWNER ROUTES (authenticated)
// ═══════════════════════════════════════════════════════════

/** @route POST /vehicles — Create a vehicle */
router.post('/', authenticate, authorize('OWNER', 'ADMIN'), validate(createVehicleSchema), ctrl.createVehicle);

/** @route PUT /vehicles/:id — Update a vehicle */
router.put('/:id', authenticate, authorize('OWNER', 'ADMIN'), validate(updateVehicleSchema), ctrl.updateVehicle);

/** @route DELETE /vehicles/:id — Soft-delete a vehicle */
router.delete('/:id', authenticate, authorize('OWNER', 'ADMIN'), ctrl.deleteVehicle);

/** @route POST /vehicles/:id/availability — Set availability */
router.post('/:id/availability', authenticate, authorize('OWNER', 'ADMIN'), validate(setAvailabilitySchema), ctrl.setAvailability);

/** @route POST /vehicles/:id/images — Upload vehicle images (max 10) */
router.post('/:id/images', authenticate, authorize('OWNER', 'ADMIN'), imageUpload.array('images', 10), ctrl.uploadImages);

/** @route DELETE /vehicles/images/:imageId — Delete an image */
router.delete('/images/:imageId', authenticate, authorize('OWNER', 'ADMIN'), ctrl.deleteImage);

/** @route PATCH /vehicles/images/:imageId/primary — Set primary image */
router.patch('/images/:imageId/primary', authenticate, authorize('OWNER', 'ADMIN'), ctrl.setPrimary);

/** @route POST /vehicles/:id/documents — Upload a document */
router.post('/:id/documents', authenticate, authorize('OWNER', 'ADMIN'), documentUpload.single('document'), ctrl.uploadDocument);

/** @route GET /vehicles/documents/:docId/signed-url — Get signed download URL */
router.get('/documents/:docId/signed-url', authenticate, ctrl.getDocSignedUrl);

// ═══════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════

/** @route GET /vehicles/admin/list — Admin list with filters */
router.get('/admin/list', authenticate, authorize('ADMIN', 'SUPPORT'), validateQuery(adminListSchema), ctrl.adminListVehicles);

/** @route PATCH /vehicles/admin/:id/approve — Approve a vehicle */
router.patch('/admin/:id/approve', authenticate, authorize('ADMIN'), validate(adminActionSchema), ctrl.approveVehicle);

/** @route PATCH /vehicles/admin/:id/reject — Reject a vehicle */
router.patch('/admin/:id/reject', authenticate, authorize('ADMIN'), validate(adminActionSchema), ctrl.rejectVehicle);

/** @route PATCH /vehicles/admin/:id/flag — Flag for review */
router.patch('/admin/:id/flag', authenticate, authorize('ADMIN', 'SUPPORT'), validate(adminActionSchema), ctrl.flagVehicle);

// ═══════════════════════════════════════════════════════════
// INTERNAL SERVICE ROUTES (used by booking-service)
// ═══════════════════════════════════════════════════════════

/** @route POST /vehicles/:id/block-dates — Block dates for a booking */
router.post('/:id/block-dates', authenticate, validate(blockDatesSchema), ctrl.blockDates);

// ═══════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════

/** @route GET /vehicles/health */
router.get('/health', ctrl.healthCheck);

export default router;
