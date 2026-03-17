/**
 * @file vehicle-service routes
 * @description Route definitions for the Vehicle listing & management service.
 */

import { Router } from 'express';
import { healthCheck } from '../controllers';

const router = Router();

router.get('/health', healthCheck);

export default router;
