/**
 * @file tests/unit/vehicle.service.test.ts
 * @description Unit tests for vehicle service with mocked Prisma and Redis.
 */

// Mock config
jest.mock('../../src/config', () => ({
  config: {
    nodeEnv: 'test', isProduction: false,
    jwt: { accessSecret: 'test-secret-1234567890' },
    cache: { vehicleTtl: 10, searchTtl: 5 },
    logLevel: 'error',
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn() },
}));

// Mock Redis
jest.mock('../../src/utils/redis.util', () => ({
  cacheVehicle: jest.fn().mockResolvedValue(undefined),
  getCachedVehicle: jest.fn().mockResolvedValue(null),
  invalidateVehicleCache: jest.fn().mockResolvedValue(undefined),
  cacheSearch: jest.fn().mockResolvedValue(undefined),
  getCachedSearch: jest.fn().mockResolvedValue(null),
}));

// Mock Elasticsearch
jest.mock('../../src/utils/elasticsearch.util', () => ({
  indexVehicle: jest.fn().mockResolvedValue(undefined),
  removeVehicleFromIndex: jest.fn().mockResolvedValue(undefined),
  ensureIndex: jest.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
const mockVehicle = {
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
};

jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return {
    ...actual,
    PrismaClient: jest.fn().mockImplementation(() => ({
      vehicle: mockVehicle,
      $disconnect: jest.fn(),
    })),
  };
});

import { createVehicle, getVehicleById, deleteVehicle, VehicleError } from '../../src/services/vehicle.service';
import { getCachedVehicle, cacheVehicle } from '../../src/utils/redis.util';

// ─── Test Data ──────────────────────────────────────────────

const testVehicle = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: 'owner-123',
  title: 'Toyota Corolla 2023',
  slug: 'toyota-corolla-2023-abc12345',
  description: 'Well maintained sedan',
  type: 'CAR', brand: 'Toyota', model: 'Corolla', year: 2023,
  color: 'White', licensePlate: 'WP-AB-1234',
  fuelType: 'PETROL', transmission: 'AUTOMATIC', seats: 5,
  engineCapacity: '1.8L', mileage: 15000,
  hourlyRate: 500, dailyRate: 3000, weeklyRate: 18000, monthlyRate: 60000,
  currency: 'LKR', securityDeposit: 5000,
  latitude: 6.9271, longitude: 79.8612,
  address: '123 Main St, Colombo', city: 'Colombo', state: 'Western',
  features: ['AC', 'Bluetooth', 'Reverse Camera'],
  isEv: false, greenScore: 34, status: 'PENDING',
  isAvailable: true, averageRating: 0, totalReviews: 0, totalBookings: 0,
  adminNote: null, flaggedForReview: false,
  isDeleted: false, deletedAt: null,
  createdAt: new Date(), updatedAt: new Date(),
  images: [], documents: [],
};

// ─── Tests ──────────────────────────────────────────────────

describe('Vehicle Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createVehicle', () => {
    it('should create a vehicle with green score', async () => {
      mockVehicle.findUnique.mockResolvedValue(null);
      mockVehicle.create.mockResolvedValue(testVehicle);

      const result = await createVehicle({
        ownerId: 'owner-123', title: 'Toyota Corolla 2023',
        type: 'CAR' as never, brand: 'Toyota', model: 'Corolla', year: 2023,
        color: 'White', licensePlate: 'WP-AB-1234',
        fuelType: 'PETROL' as never, transmission: 'AUTOMATIC',
        hourlyRate: 500, dailyRate: 3000,
        latitude: 6.9271, longitude: 79.8612,
        address: '123 Main St', city: 'Colombo',
      });

      expect(result.id).toBe(testVehicle.id);
      expect(mockVehicle.create).toHaveBeenCalledTimes(1);
    });

    it('should throw 409 for duplicate license plate', async () => {
      mockVehicle.findUnique.mockResolvedValue(testVehicle);

      await expect(createVehicle({
        ownerId: 'owner-123', title: 'Test', type: 'CAR' as never,
        brand: 'Toyota', model: 'Corolla', year: 2023, color: 'White',
        licensePlate: 'WP-AB-1234', fuelType: 'PETROL' as never,
        transmission: 'AUTOMATIC', hourlyRate: 500, dailyRate: 3000,
        latitude: 6.9271, longitude: 79.8612, address: '123 Main St', city: 'Colombo',
      })).rejects.toThrow(VehicleError);
    });
  });

  describe('getVehicleById', () => {
    it('should return cached vehicle on hit', async () => {
      (getCachedVehicle as jest.Mock).mockResolvedValue(testVehicle);

      const result = await getVehicleById(testVehicle.id);
      expect(result.id).toBe(testVehicle.id);
      expect(mockVehicle.findFirst).not.toHaveBeenCalled();
    });

    it('should query DB and cache on miss', async () => {
      (getCachedVehicle as jest.Mock).mockResolvedValue(null);
      mockVehicle.findFirst.mockResolvedValue(testVehicle);

      const result = await getVehicleById(testVehicle.id);
      expect(result.id).toBe(testVehicle.id);
      expect(cacheVehicle).toHaveBeenCalledWith(testVehicle.id, testVehicle);
    });

    it('should throw 404 for non-existent vehicle', async () => {
      (getCachedVehicle as jest.Mock).mockResolvedValue(null);
      mockVehicle.findFirst.mockResolvedValue(null);

      await expect(getVehicleById('non-existent')).rejects.toThrow(VehicleError);
    });
  });

  describe('deleteVehicle', () => {
    it('should throw 403 if non-owner tries to delete', async () => {
      mockVehicle.findFirst.mockResolvedValue(testVehicle);

      await expect(deleteVehicle(testVehicle.id, 'other-user')).rejects.toThrow(VehicleError);
    });
  });
});
