/**
 * @file services/inspection.service.ts
 * @description Pre/post rental inspections via photo evidence.
 */

import { Inspection } from '../models';

export async function addInspection(
  bookingId: string,
  vehicleId: string,
  type: 'PRE_RENTAL' | 'POST_RENTAL',
  userId: string,
  photos: { url: string; description?: string }[],
  notes?: string
) {
  // Check if exists
  const existing = await Inspection.findOne({ bookingId, type });
  if (existing) {
    throw new Error(`${type} inspection already exists for this booking`);
  }

  const inspection = await Inspection.create({
    bookingId,
    vehicleId,
    type,
    uploadedBy: userId,
    photos,
    notes,
  });

  return inspection;
}

export async function getInspections(bookingId: string) {
  return Inspection.find({ bookingId });
}
