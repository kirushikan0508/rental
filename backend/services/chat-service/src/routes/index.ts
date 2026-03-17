/**
 * @file chat-service routes
 * @description Route definitions for the Real-time messaging service.
 */

import { Router } from 'express';
import { healthCheck } from '../controllers';

const router = Router();

router.get('/health', healthCheck);

export default router;
