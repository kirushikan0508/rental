/**
 * @file payment-service routes
 * @description Route definitions for the Payment processing & payouts service.
 */

import { Router } from 'express';
import { healthCheck } from '../controllers';

const router = Router();

router.get('/health', healthCheck);

export default router;
