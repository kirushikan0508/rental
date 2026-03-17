/**
 * @file services/admin.service.ts
 * @description Admin-level vehicle management — approve, reject, flag, list all.
 */

import { Vehicle, VehicleStatus, Prisma } from '@prisma/client';
import { prisma } from './vehicle.service';
import { invalidateVehicleCache } from '../utils/redis.util';
import { indexVehicle, removeVehicleFromIndex, EsVehicleDoc } from '../utils/elasticsearch.util';
import { logger } from '../utils/logger';

// ─── Custom Error ───────────────────────────────────────────

export class AdminError extends Error {
  constructor(public message: string, public statusCode: number, public code: string) {
    super(message);
    this.name = 'AdminError';
  }
}

// ─── Helper ─────────────────────────────────────────────────

function toEsDoc(v: Vehicle): EsVehicleDoc {
  return {
    id: v.id, ownerId: v.ownerId, title: v.title, description: v.description,
    slug: v.slug, type: v.type, brand: v.brand, model: v.model, year: v.year,
    color: v.color, fuelType: v.fuelType, transmission: v.transmission, seats: v.seats,
    hourlyRate: v.hourlyRate, dailyRate: v.dailyRate, weeklyRate: v.weeklyRate,
    monthlyRate: v.monthlyRate, currency: v.currency,
    location: { lat: v.latitude, lon: v.longitude },
    address: v.address, city: v.city, features: v.features,
    isEv: v.isEv, greenScore: v.greenScore, status: v.status,
    isAvailable: v.isAvailable, averageRating: v.averageRating,
    totalReviews: v.totalReviews, totalBookings: v.totalBookings,
    primaryImageUrl: null,
    createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// APPROVE VEHICLE
// ═══════════════════════════════════════════════════════════

/**
 * Approves a pending vehicle listing.
 * Only admins can call this.
 */
export async function approveVehicle(vehicleId: string, adminNote?: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new AdminError('Vehicle not found', 404, 'NOT_FOUND');
  if (vehicle.status === VehicleStatus.APPROVED) {
    throw new AdminError('Vehicle is already approved', 400, 'ALREADY_APPROVED');
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: VehicleStatus.APPROVED,
      adminNote: adminNote || 'Approved by admin',
      flaggedForReview: false,
    },
  });

  await invalidateVehicleCache(vehicleId);
  indexVehicle(toEsDoc(updated)).catch((e) => logger.error('ES sync failed:', e));
  logger.info(`✅ Vehicle approved: ${vehicleId}`);
  return updated;
}

// ═══════════════════════════════════════════════════════════
// REJECT VEHICLE
// ═══════════════════════════════════════════════════════════

/**
 * Rejects a vehicle listing with a reason.
 */
export async function rejectVehicle(vehicleId: string, reason: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new AdminError('Vehicle not found', 404, 'NOT_FOUND');

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: VehicleStatus.REJECTED,
      adminNote: reason,
      isAvailable: false,
    },
  });

  await invalidateVehicleCache(vehicleId);
  removeVehicleFromIndex(vehicleId).catch((e) => logger.error('ES removal failed:', e));
  logger.info(`❌ Vehicle rejected: ${vehicleId} — ${reason}`);
  return updated;
}

// ═══════════════════════════════════════════════════════════
// FLAG FOR REVIEW
// ═══════════════════════════════════════════════════════════

/**
 * Flags a vehicle for manual review.
 */
export async function flagVehicle(vehicleId: string, reason: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new AdminError('Vehicle not found', 404, 'NOT_FOUND');

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      flaggedForReview: true,
      adminNote: reason,
    },
  });

  await invalidateVehicleCache(vehicleId);
  logger.info(`🚩 Vehicle flagged: ${vehicleId} — ${reason}`);
  return updated;
}

// ═══════════════════════════════════════════════════════════
// LIST ALL VEHICLES (Admin)
// ═══════════════════════════════════════════════════════════

interface AdminListParams {
  status?: VehicleStatus;
  flagged?: boolean;
  type?: string;
  city?: string;
  page?: number;
  limit?: number;
}

/**
 * Lists all vehicles with admin-level filters.
 * Includes deleted vehicles if requested.
 */
export async function listAllVehicles(params: AdminListParams): Promise<{
  vehicles: Vehicle[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.VehicleWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.flagged !== undefined) where.flaggedForReview = params.flagged;
  if (params.type) where.type = params.type as Prisma.EnumVehicleTypeFilter;
  if (params.city) where.city = params.city;

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { images: { where: { isPrimary: true }, take: 1 }, documents: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return { vehicles, total, page, totalPages: Math.ceil(total / limit) };
}
