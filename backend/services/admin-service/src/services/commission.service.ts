import { Commission, ICommission } from '../models/Commission';
import { Types } from 'mongoose';

export class CommissionService {
  /**
   * Gets the currently active global commission rate
   */
  static async getGlobalCommission() {
    return Commission.findOne().sort({ effectiveFrom: -1 });
  }

  /**
   * Sets a new global commission rate
   */
  static async setGlobalCommission(percentage: number, adminId: string) {
    const commission = new Commission({
      platformFeePercentage: percentage,
      createdBy: new Types.ObjectId(adminId),
      effectiveFrom: new Date()
    });
    return commission.save();
  }

  /**
   * Overrides commission rate for a specific owner
   */
  static async setOwnerCommissionOverride(ownerId: string, percentage: number, reason: string, adminId: string) {
    const activeCommission = await this.getGlobalCommission();
    if (!activeCommission) throw new Error('Global commission not set');

    // Remove existing override for this owner if any
    activeCommission.perOwnerOverrides = activeCommission.perOwnerOverrides.filter(
      (o) => o.ownerId.toString() !== ownerId
    );

    // Add new override
    activeCommission.perOwnerOverrides.push({
      ownerId: new Types.ObjectId(ownerId),
      feePercentage: percentage,
      reason
    });

    return activeCommission.save();
  }
}
