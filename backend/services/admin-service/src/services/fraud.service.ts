import { FraudFlag, IFraudFlag } from '../models/FraudFlag';
import { Types } from 'mongoose';

export class FraudService {
  /**
   * Logs a new fraud flag against a target (User, Vehicle, Booking)
   */
  static async flagActivity(data: Partial<IFraudFlag>, adminId?: string) {
    const flag = new FraudFlag({
      ...data,
      reportedBy: adminId ? new Types.ObjectId(adminId) : undefined, // Undefined means System reported
    });
    return flag.save();
  }

  /**
   * Resolves a fraud flag
   */
  static async resolveFlag(flagId: string, resolutionNotes: string, adminId: string, dismiss: boolean = false) {
    const flag = await FraudFlag.findById(flagId);
    if (!flag) throw new Error('Fraud flag not found');

    flag.status = dismiss ? 'dismissed' : 'resolved';
    flag.resolvedAt = new Date();
    flag.resolvedBy = new Types.ObjectId(adminId);
    flag.resolutionNotes = resolutionNotes;

    return flag.save();
  }

  /**
   * Retrieves active fraud flags for review
   */
  static async getActiveFlags(filters: any = {}) {
    return FraudFlag.find({ ...filters, status: { $in: ['open', 'investigating'] } }).sort({ priority: -1, createdAt: -1 });
  }

  /**
   * Example CRON job logic for Auto-Detecting Fraud
   * e.g., Checking multiple failed payments
   */
  static async runAutoFraudDetection() {
    // Logic: 
    // 1. Group failed payments by User in last 24h
    // 2. If count > 3, create a targetType='User', reason='Multiple failed payments' flag
    // 3. Find duplicate IPs across users
    console.log("ðŸ”Ž Running automated fraud detection sweeps");
  }
}
