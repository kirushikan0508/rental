/**
 * @file controllers/vehicle.controller.ts
 * @description Express request handlers for all vehicle-service endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import * as vehicleSvc from '../services/vehicle.service';
import * as availSvc from '../services/availability.service';
import * as uploadSvc from '../services/upload.service';
import * as searchSvc from '../services/search.service';
import * as adminSvc from '../services/admin.service';
import { DocumentType } from '@prisma/client';
import { logger } from '../utils/logger';

// ─── Helpers ────────────────────────────────────────────────

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof vehicleSvc.VehicleError || error instanceof availSvc.AvailabilityError ||
      error instanceof uploadSvc.UploadError || error instanceof adminSvc.AdminError) {
    const e = error as { statusCode: number; code: string; message: string };
    res.status(e.statusCode).json({ success: false, error: { code: e.code, message: e.message } });
    return;
  }
  logger.error('Unhandled error:', error);
  next(error);
}

// ═══════════════════════════════════════════════════════════
// VEHICLE CRUD
// ═══════════════════════════════════════════════════════════

/** POST /vehicles */
export async function createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await vehicleSvc.createVehicle({ ...req.body, ownerId: req.user!.userId });
    res.status(201).json({ success: true, message: 'Vehicle created', data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/:id */
export async function getVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await vehicleSvc.getVehicleById(req.params.id);
    res.json({ success: true, data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/slug/:slug */
export async function getVehicleBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await vehicleSvc.getVehicleBySlug(req.params.slug);
    res.json({ success: true, data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/owner/:ownerId */
export async function getOwnerVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await vehicleSvc.getVehiclesByOwner(req.params.ownerId, { page, limit });
    res.json({ success: true, data: result });
  } catch (e) { handleError(e, res, next); }
}

/** PUT /vehicles/:id */
export async function updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await vehicleSvc.updateVehicle(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, message: 'Vehicle updated', data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** DELETE /vehicles/:id */
export async function deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await vehicleSvc.deleteVehicle(req.params.id, req.user!.userId);
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (e) { handleError(e, res, next); }
}

// ═══════════════════════════════════════════════════════════
// AVAILABILITY
// ═══════════════════════════════════════════════════════════

/** POST /vehicles/:id/availability */
export async function setAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const records = await availSvc.setAvailability({
      vehicleId: req.params.id, ownerId: req.user!.userId, ...req.body,
    });
    res.json({ success: true, message: `${records.length} dates updated`, data: { availability: records } });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/:id/availability?startDate=&endDate= */
export async function checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const result = await availSvc.checkAvailability(req.params.id, startDate, endDate);
    res.json({ success: true, data: result });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/:id/calendar?startDate=&endDate= */
export async function getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const calendar = await availSvc.getCalendar(req.params.id, startDate, endDate);
    res.json({ success: true, data: { calendar } });
  } catch (e) { handleError(e, res, next); }
}

/** POST /vehicles/:id/block-dates (internal — called by booking-service) */
export async function blockDates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await availSvc.blockDatesForBooking(req.params.id, new Date(req.body.startDate), new Date(req.body.endDate), req.body.bookingId);
    res.json({ success: true, message: 'Dates blocked' });
  } catch (e) { handleError(e, res, next); }
}

// ═══════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════

/** POST /vehicles/:id/images */
export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: { code: 'NO_FILES', message: 'No images provided' } });
      return;
    }
    const images = await uploadSvc.uploadVehicleImages(req.params.id, req.user!.userId, files);
    res.status(201).json({ success: true, message: `${images.length} images uploaded`, data: { images } });
  } catch (e) { handleError(e, res, next); }
}

/** DELETE /vehicles/images/:imageId */
export async function deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await uploadSvc.deleteVehicleImage(req.params.imageId, req.user!.userId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (e) { handleError(e, res, next); }
}

/** PATCH /vehicles/images/:imageId/primary */
export async function setPrimary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const image = await uploadSvc.setPrimaryImage(req.params.imageId, req.user!.userId);
    res.json({ success: true, message: 'Primary image set', data: { image } });
  } catch (e) { handleError(e, res, next); }
}

/** POST /vehicles/:id/documents */
export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No document provided' } });
      return;
    }
    const doc = await uploadSvc.uploadVehicleDocument(
      req.params.id, req.user!.userId, file,
      req.body.type as DocumentType, req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
    );
    res.status(201).json({ success: true, message: 'Document uploaded', data: { document: doc } });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/documents/:docId/signed-url */
export async function getDocSignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const url = await uploadSvc.getDocumentSignedUrl(req.params.docId, req.user!.userId);
    res.json({ success: true, data: { signedUrl: url } });
  } catch (e) { handleError(e, res, next); }
}

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════

/** GET /vehicles/search */
export async function searchVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await searchSvc.searchVehicles(req.query as unknown as searchSvc.SearchParams);
    res.json({ success: true, data: result });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/:id/recommendations */
export async function getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6;
    const vehicles = await searchSvc.getRecommendations(req.params.id, lat, lng, limit);
    res.json({ success: true, data: { recommendations: vehicles } });
  } catch (e) { handleError(e, res, next); }
}

// ═══════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════

/** PATCH /vehicles/admin/:id/approve */
export async function approveVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await adminSvc.approveVehicle(req.params.id, req.body.note);
    res.json({ success: true, message: 'Vehicle approved', data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** PATCH /vehicles/admin/:id/reject */
export async function rejectVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await adminSvc.rejectVehicle(req.params.id, req.body.note);
    res.json({ success: true, message: 'Vehicle rejected', data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** PATCH /vehicles/admin/:id/flag */
export async function flagVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vehicle = await adminSvc.flagVehicle(req.params.id, req.body.note);
    res.json({ success: true, message: 'Vehicle flagged', data: { vehicle } });
  } catch (e) { handleError(e, res, next); }
}

/** GET /vehicles/admin/list */
export async function adminListVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminSvc.listAllVehicles(req.query as Record<string, string>);
    res.json({ success: true, data: result });
  } catch (e) { handleError(e, res, next); }
}

// ═══════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════

export function healthCheck(_req: Request, res: Response): void {
  res.json({ success: true, service: 'vehicle-service', status: 'healthy', timestamp: new Date().toISOString() });
}
