import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

// Apply admin protection to all routes in this router
router.use(adminAuth);

// Analytics
router.get('/dashboard', AdminController.getDashboardStats);

// Commission
router.post('/commission', AdminController.setGlobalCommission);

// KYC
router.post('/kyc/review', AdminController.reviewKyc);

// Fraud Flags
router.get('/fraud/flags', AdminController.getFraudFlags);

// User GDPR Export
router.get('/users/:userId/export', AdminController.exportUserGdpr);

// TODO: Map other routes like POST /announcements, GET /vehicles/pending, etc.

export default router;
