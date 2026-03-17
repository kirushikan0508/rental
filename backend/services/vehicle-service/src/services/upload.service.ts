/**
 * @file services/upload.service.ts
 * @description Image and document upload service.
 * Handles S3 upload, Prisma record creation, and signed URL generation.
 */

import { VehicleImage, VehicleDocument, DocumentType } from '@prisma/client';
import { prisma } from './vehicle.service';
import { uploadToS3, deleteFromS3, getSignedDownloadUrl, deleteMultipleFromS3 } from '../utils/s3.util';
import { invalidateVehicleCache } from '../utils/redis.util';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Custom Error ───────────────────────────────────────────

export class UploadError extends Error {
  constructor(public message: string, public statusCode: number, public code: string) {
    super(message);
    this.name = 'UploadError';
  }
}

// ═══════════════════════════════════════════════════════════
// VEHICLE IMAGES
// ═══════════════════════════════════════════════════════════

/**
 * Uploads vehicle images to S3 and creates VehicleImage records.
 *
 * @param vehicleId - Vehicle UUID
 * @param ownerId - Owner UUID for auth check
 * @param files - Array of Multer file objects
 * @returns Created VehicleImage records
 */
export async function uploadVehicleImages(
  vehicleId: string,
  ownerId: string,
  files: Express.Multer.File[],
): Promise<VehicleImage[]> {
  // Validate vehicle ownership
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
    include: { images: true },
  });
  if (!vehicle) throw new UploadError('Vehicle not found', 404, 'NOT_FOUND');
  if (vehicle.ownerId !== ownerId) throw new UploadError('Not authorised', 403, 'FORBIDDEN');

  // Check max images limit
  const currentCount = vehicle.images.length;
  if (currentCount + files.length > config.upload.maxImagesPerVehicle) {
    throw new UploadError(
      `Maximum ${config.upload.maxImagesPerVehicle} images allowed. Currently ${currentCount}.`,
      400,
      'MAX_IMAGES_EXCEEDED',
    );
  }

  // Upload to S3 and create DB records
  const imageRecords: VehicleImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { url, key } = await uploadToS3(
      file.buffer,
      file.originalname,
      `vehicles/${vehicleId}/images`,
      file.mimetype,
    );

    const image = await prisma.vehicleImage.create({
      data: {
        vehicleId,
        url,
        key,
        isPrimary: currentCount === 0 && i === 0, // First image is primary
        sortOrder: currentCount + i,
      },
    });
    imageRecords.push(image);
  }

  await invalidateVehicleCache(vehicleId);
  logger.info(`📸 ${files.length} images uploaded for vehicle ${vehicleId}`);
  return imageRecords;
}

/**
 * Deletes a vehicle image from S3 and the database.
 */
export async function deleteVehicleImage(
  imageId: string,
  ownerId: string,
): Promise<void> {
  const image = await prisma.vehicleImage.findUnique({
    where: { id: imageId },
    include: { vehicle: { select: { ownerId: true, id: true } } },
  });
  if (!image) throw new UploadError('Image not found', 404, 'NOT_FOUND');
  if (image.vehicle.ownerId !== ownerId) throw new UploadError('Not authorised', 403, 'FORBIDDEN');

  await deleteFromS3(image.key);
  await prisma.vehicleImage.delete({ where: { id: imageId } });
  await invalidateVehicleCache(image.vehicle.id);
  logger.info(`🗑️  Image deleted: ${imageId}`);
}

/**
 * Sets a specific image as the primary image for a vehicle.
 */
export async function setPrimaryImage(imageId: string, ownerId: string): Promise<VehicleImage> {
  const image = await prisma.vehicleImage.findUnique({
    where: { id: imageId },
    include: { vehicle: { select: { ownerId: true, id: true } } },
  });
  if (!image) throw new UploadError('Image not found', 404, 'NOT_FOUND');
  if (image.vehicle.ownerId !== ownerId) throw new UploadError('Not authorised', 403, 'FORBIDDEN');

  // Unset current primary and set the new one in a transaction
  await prisma.$transaction([
    prisma.vehicleImage.updateMany({
      where: { vehicleId: image.vehicleId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.vehicleImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    }),
  ]);

  await invalidateVehicleCache(image.vehicle.id);
  return prisma.vehicleImage.findUniqueOrThrow({ where: { id: imageId } });
}

// ═══════════════════════════════════════════════════════════
// VEHICLE DOCUMENTS
// ═══════════════════════════════════════════════════════════

/**
 * Uploads a vehicle document (RC book, insurance, pollution cert).
 */
export async function uploadVehicleDocument(
  vehicleId: string,
  ownerId: string,
  file: Express.Multer.File,
  type: DocumentType,
  expiryDate?: Date,
): Promise<VehicleDocument> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, isDeleted: false },
  });
  if (!vehicle) throw new UploadError('Vehicle not found', 404, 'NOT_FOUND');
  if (vehicle.ownerId !== ownerId) throw new UploadError('Not authorised', 403, 'FORBIDDEN');

  // Check if document of this type already exists — replace it
  const existing = await prisma.vehicleDocument.findFirst({
    where: { vehicleId, type },
  });
  if (existing) {
    await deleteFromS3(existing.key);
    await prisma.vehicleDocument.delete({ where: { id: existing.id } });
  }

  const { url, key } = await uploadToS3(
    file.buffer,
    file.originalname,
    `vehicles/${vehicleId}/documents`,
    file.mimetype,
  );

  const document = await prisma.vehicleDocument.create({
    data: { vehicleId, type, url, key, expiryDate },
  });

  await invalidateVehicleCache(vehicleId);
  logger.info(`📄 Document uploaded: ${type} for vehicle ${vehicleId}`);
  return document;
}

/**
 * Generates a signed download URL for a vehicle document.
 */
export async function getDocumentSignedUrl(
  documentId: string,
  userId: string,
): Promise<string> {
  const doc = await prisma.vehicleDocument.findUnique({
    where: { id: documentId },
    include: { vehicle: { select: { ownerId: true } } },
  });
  if (!doc) throw new UploadError('Document not found', 404, 'NOT_FOUND');

  // Only owner or admin can access documents
  // (admin check happens in the middleware layer)
  if (doc.vehicle.ownerId !== userId) {
    throw new UploadError('Not authorised to access this document', 403, 'FORBIDDEN');
  }

  return getSignedDownloadUrl(doc.key);
}

/**
 * Deletes all images and documents from S3 when a vehicle is permanently removed.
 */
export async function deleteAllVehicleAssets(vehicleId: string): Promise<void> {
  const [images, docs] = await Promise.all([
    prisma.vehicleImage.findMany({ where: { vehicleId }, select: { key: true } }),
    prisma.vehicleDocument.findMany({ where: { vehicleId }, select: { key: true } }),
  ]);

  const allKeys = [...images.map((i) => i.key), ...docs.map((d) => d.key)];
  if (allKeys.length > 0) {
    await deleteMultipleFromS3(allKeys);
    logger.info(`🗑️  Deleted ${allKeys.length} S3 assets for vehicle ${vehicleId}`);
  }
}
