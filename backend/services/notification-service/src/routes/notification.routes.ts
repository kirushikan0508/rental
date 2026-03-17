import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';

const router = Router();

// Internal API to trigger notification queueing
router.post('/send', notificationController.sendNotification);

// User history for the in-app bell
router.get('/', notificationController.getNotifications);

// User preference management
router.put('/preferences', notificationController.updatePreferences);

export default router;
