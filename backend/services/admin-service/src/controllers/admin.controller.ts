import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { CommissionService } from '../services/commission.service';
import { KycService } from '../services/kyc.service';
import { FraudService } from '../services/fraud.service';
import { UserService } from '../services/user.service';

export class AdminController {
  // â”€â”€â”€ Analytics â”€â”€â”€
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await AnalyticsService.getDashboardStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // â”€â”€â”€ Commission â”€â”€â”€
  static async setGlobalCommission(req: Request, res: Response) {
    try {
      const { percentage } = req.body;
      const adminId = req.user?.id as string;
      const commission = await CommissionService.setGlobalCommission(percentage, adminId);
      res.status(200).json({ success: true, data: commission });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // â”€â”€â”€ KYC â”€â”€â”€
  static async reviewKyc(req: Request, res: Response) {
      try {
          const { userId, action, reason } = req.body;
          const adminId = req.user?.id as string;
          let result;

          if (action === 'approve') {
              result = await KycService.approveKyc(userId, adminId, reason);
          } else if (action === 'reject') {
              result = await KycService.rejectKyc(userId, reason, adminId);
          } else {
              return res.status(400).json({ success: false, message: 'Invalid action' });
          }

          res.status(200).json(result);
      } catch (error: any) {
          res.status(400).json({ success: false, message: error.message });
      }
  }

    // â”€â”€â”€ Fraud Flags â”€â”€â”€
    static async getFraudFlags(req: Request, res: Response) {
        try {
            const flags = await FraudService.getActiveFlags();
            res.status(200).json({ success: true, data: flags });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // â”€â”€â”€ GDPR Export â”€â”€â”€
    static async exportUserGdpr(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const csvData = await UserService.exportUserDataCsv(userId);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=user_${userId}_data.csv`);
            res.status(200).send(csvData);
        } catch (error: any) {
           res.status(400).json({ success: false, message: error.message });
        }
    }
}
