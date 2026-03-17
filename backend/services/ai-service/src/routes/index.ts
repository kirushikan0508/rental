/**
 * @file ai-service routes
 * @description Route definitions for the AI/ML integration service.
 */

import { Router } from 'express';
import { healthCheck } from '../controllers';

const router = Router();

router.get('/health', healthCheck);

export default router;
