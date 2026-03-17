/**
 * @file services/dispute.service.ts
 * @description Raise and resolve damage/violation disputes.
 */

import { Dispute, DisputeStatus, DisputeStatusType } from '../models';

export async function raiseDispute(
  bookingId: string,
  vehicleId: string,
  raisedBy: string,
  raisedByRole: 'RENTER' | 'OWNER',
  description: string,
  evidence: { url: string; description?: string }[]
) {
  const existing = await Dispute.findOne({ bookingId, raisedBy });
  if (existing) {
    throw new Error('You have already raised a dispute for this booking');
  }

  const dispute = await Dispute.create({
    bookingId,
    vehicleId,
    raisedBy,
    raisedByRole,
    description,
    evidence,
    status: DisputeStatus.OPEN,
  });

  return dispute;
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  status: DisputeStatusType,
  resolution: string,
  compensationAmount?: number
) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error('Dispute not found');

  if (dispute.status === DisputeStatus.CLOSED) {
    throw new Error('Dispute is already closed');
  }

  dispute.status = status;
  dispute.resolution = resolution;
  dispute.resolvedBy = adminId;
  dispute.resolvedAt = new Date();
  if (compensationAmount !== undefined) {
    dispute.compensationAmount = compensationAmount;
  }

  await dispute.save();
  return dispute;
}

export async function getDisputesAdmin(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const disputes = await Dispute.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Dispute.countDocuments();

  return { disputes, total, page, totalPages: Math.ceil(total / limit) };
}
