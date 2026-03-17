/**
 * @file services/vehicle.service.ts
 * @description Core vehicle CRUD + green score calculation.
 *
 * All mutations invalidate Redis cache and sync to Elasticsearch.
 */

import { PrismaClient, Vehicle, VehicleStatus, VehicleType, FuelType, Prisma } from '@prisma/client';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import { cacheVehicle, getCachedVehicle, invalidateVehicleCache } from '../utils/redis.util';
import { indexVehicle, removeVehicleFromIndex, EsVehicleDoc } from '../utils/elasticsearch.util';
import { logger } from '../utils/logger';
import { config } from '../config';

// ─── Prisma Client Singleton ────────────────────────────────

const prisma = new PrismaClient({
  log: config.isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
});

// ─── Custom Error ───────────────────────────────────────────

export class VehicleError extends Error {
  constructor(public message: string, public statusCode: number, public code: string) {
    super(message);
    this.name = 'VehicleError';
  }
}

// ─── Include Relations ──────────────────────────────────────

const vehicleWithRelations = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  documents: true,
};

// ─── Green Score Calculator ─────────────────────────────────

/**
 * Computes a green score (0–100) based on fuel type and vehicle age.
 * Electric = 100 base, Hybrid = 70, Petrol/Diesel penalized by age.
 */
function calculateGreenScore(fuelType: FuelType, year: number): number {
  const age = new Date().getFullYear() - year;
  const fuelScores: Record<FuelType, number> = {
    ELECTRIC: 100,
    HYBRID: 70,
    PETROL: 40,
    DIESEL: 30,
  };
  const base = fuelScores[fuelType] ?? 30;
  const agePenalty = Math.min(age * 2, 20); // max 20-point penalty
  return Math.max(0, base - agePenalty);
}

// ─── ES Doc Builder ─────────────────────────────────────────

function toEsDoc(v: Vehicle & { images?: { url: string; isPrimary: boolean }[] }): EsVehicleDoc {
  const primaryImg = v.images?.find((i) => i.isPrimary);
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
    primaryImageUrl: primaryImg?.url ?? null,
    createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════

export interface CreateVehicleInput {
  ownerId: string;
  title: string;
  description?: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  fuelType: FuelType;
  transmission: 'MANUAL' | 'AUTOMATIC';
  seats?: number;
  engineCapacity?: string;
  mileage?: number;
  hourlyRate: number;
  dailyRate: number;
  weeklyRate?: number;
  monthlyRate?: number;
  securityDeposit?: number;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state?: string;
  features?: string[];
}

/**
 * Creates a new vehicle listing.
 * Automatically calculates green score and EV badge.
 */
export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  // Check for duplicate license plate
  const existing = await prisma.vehicle.findUnique({
    where: { licensePlate: input.licensePlate },
  });
  if (existing) {
    throw new VehicleError('A vehicle with this license plate already exists', 409, 'DUPLICATE_LICENSE');
  }

  // Generate unique slug
  const baseSlug = slugify(`${input.brand}-${input.model}-${input.year}`, { lower: true, strict: true });
  const slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;

  // Calculate green score & EV badge
  const greenScore = calculateGreenScore(input.fuelType, input.year);
  const isEv = input.fuelType === 'ELECTRIC';

  const vehicle = await prisma.vehicle.create({
    data: {
      ...input,
      slug,
      greenScore,
      isEv,
      status: VehicleStatus.PENDING,
    },
    include: vehicleWithRelations,
  });

  logger.info(`🚗 Vehicle created: ${vehicle.id} (${vehicle.title})`);

  // Sync to Elasticsearch (fire & forget)
  indexVehicle(toEsDoc(vehicle)).catch((e) => logger.error('ES sync failed:', e));

  return vehicle;
}

// ═══════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════

/**
 * Gets a vehicle by ID. Checks Redis cache first.
 */
export async function getVehicleById(id: string): Promise<Vehicle> {
  // Check cache
  const cached = await getCachedVehicle<Vehicle>(id);
  if (cached) return cached;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, isDeleted: false },
    include: vehicleWithRelations,
  });

  if (!vehicle) {
    throw new VehicleError('Vehicle not found', 404, 'NOT_FOUND');
  }

  // Populate cache
  await cacheVehicle(id, vehicle);
  return vehicle;
}

/**
 * Gets a vehicle by its slug.
 */
export async function getVehicleBySlug(slug: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { slug, isDeleted: false },
    include: vehicleWithRelations,
  });
  if (!vehicle) throw new VehicleError('Vehicle not found', 404, 'NOT_FOUND');
  return vehicle;
}

/** Pagination params */
interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Gets all vehicles owned by a specific user.
 */
export async function getVehiclesByOwner(
  ownerId: string,
  { page = 1, limit = 20 }: PaginationParams = {},
): Promise<{ vehicles: Vehicle[]; total: number; page: number; totalPages: number }> {
  const skip = (page - 1) * limit;

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId, isDeleted: false },
      include: vehicleWithRelations,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.vehicle.count({ where: { ownerId, isDeleted: false } }),
  ]);

  return { vehicles, total, page, totalPages: Math.ceil(total / limit) };
}

// ═══════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════

/**
 * Updates a vehicle. Only the owner can edit.
 */
export async function updateVehicle(
  id: string,
  ownerId: string,
  data: Partial<CreateVehicleInput>,
): Promise<Vehicle> {
  const existing = await prisma.vehicle.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new VehicleError('Vehicle not found', 404, 'NOT_FOUND');
  if (existing.ownerId !== ownerId) throw new VehicleError('Not authorised to edit this vehicle', 403, 'FORBIDDEN');

  // Recalc green score if fuel type or year changed
  const fuelType = (data.fuelType as FuelType) ?? existing.fuelType;
  const year = data.year ?? existing.year;
  const greenScore = calculateGreenScore(fuelType, year);
  const isEv = fuelType === 'ELECTRIC';

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: { ...data, greenScore, isEv, updatedAt: new Date() },
    include: vehicleWithRelations,
  });

  // Invalidate cache & re-index
  await invalidateVehicleCache(id);
  indexVehicle(toEsDoc(vehicle)).catch((e) => logger.error('ES sync failed:', e));

  logger.info(`🔄 Vehicle updated: ${id}`);
  return vehicle;
}

// ═══════════════════════════════════════════════════════════
// SOFT DELETE
// ═══════════════════════════════════════════════════════════

/**
 * Soft-deletes a vehicle. Only the owner can delete.
 */
export async function deleteVehicle(id: string, ownerId: string): Promise<void> {
  const existing = await prisma.vehicle.findFirst({ where: { id, isDeleted: false } });
  if (!existing) throw new VehicleError('Vehicle not found', 404, 'NOT_FOUND');
  if (existing.ownerId !== ownerId) throw new VehicleError('Not authorised to delete this vehicle', 403, 'FORBIDDEN');

  await prisma.vehicle.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), isAvailable: false },
  });

  await invalidateVehicleCache(id);
  removeVehicleFromIndex(id).catch((e) => logger.error('ES removal failed:', e));
  logger.info(`🗑️  Vehicle soft-deleted: ${id}`);
}

// ─── Prisma Cleanup ─────────────────────────────────────────

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
