import { compareFaces } from '../utils/rekognition';
// Mock User model import - In a real setup, import from shared models
// import { User } from '@shared/models';

export class KycService {
  /**
   * Compare submitted KYC selfie with NIC using AWS Rekognition
   * @param selfieBuffer Buffer containing selfie image
   * @param nicBuffer Buffer containing NIC image
   */
  static async verifyKycImages(selfieBuffer: Buffer, nicBuffer: Buffer) {
    try {
      const matchResult = await compareFaces(selfieBuffer, nicBuffer);
      return {
        success: true,
        isMatch: matchResult.isMatch,
        similarity: matchResult.similarity || 0,
        confidence: (matchResult.similarity || 0) > 90 ? 'High' : (matchResult.similarity || 0) > 75 ? 'Medium' : 'Low'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'AWS Rekognition failed to process images: ' + error.message
      };
    }
  }

  /**
   * Approves a user's KYC submission manually
   */
  static async approveKyc(userId: string, adminId: string, notes?: string) {
    // const user = await User.findById(userId);
    // if (!user) throw new Error("User not found");
    
    // user.kycStatus = 'approved';
    // user.kycVerifiedBy = adminId;
    // user.kycVerifiedAt = new Date();
    // user.kycNotes = notes;
    // await user.save();
    
    return { success: true, message: `KYC for user ${userId} approved.` };
  }

  /**
   * Rejects a user's KYC submission and optionally requests resubmission
   */
  static async rejectKyc(userId: string, reason: string, adminId: string, requireResubmission: boolean = true) {
    // const user = await User.findById(userId);
    // if (!user) throw new Error("User not found");
    
    // user.kycStatus = requireResubmission ? 'resubmission_required' : 'rejected';
    // user.kycRejectionReason = reason;
    // user.kycVerifiedBy = adminId;
    // user.kycVerifiedAt = new Date();
    // await user.save();
    
    return { success: true, message: `KYC for user ${userId} rejected. Reason: ${reason}` };
  }
}
