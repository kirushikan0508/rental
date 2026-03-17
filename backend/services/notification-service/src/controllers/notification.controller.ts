import { Request, Response } from 'express';
import { UserPreference } from '../models/UserPreference';
import { Notification } from '../models/Notification';
import { notificationQueue } from '../queues/notification.queue';

export const notificationController = {
  /**
   * POST /notifications/send (Internal logic)
   * Triggers a new notification into the queue
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, type, title, body, data, userContact } = req.body;

      if (!userId || !type || !title || !body) {
        res.status(400).json({ success: false, error: 'Missing required notification fields' });
        return;
      }

      // 1. Log to DB as Pending
      await Notification.create({
        userId,
        type,
        title,
        body,
        data,
      });

      // 2. Push to BullMQ for async delivery
      await notificationQueue.add(type, {
        userId,
        type,
        title,
        body,
        data,
        userContact,
      });

      res.status(202).json({ success: true, message: 'Notification queued for delivery' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * GET /notifications
   * Fetch user's notification history (for the in-app bell)
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'mock_user_id';
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);

      res.status(200).json({ success: true, data: notifications });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  },

  /**
   * PUT /notifications/preferences
   * Update channel settings for specific notification types
   */
  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || 'mock_user_id';
      const { type, preferences, globalMute, dndMode } = req.body;

      let userPref = await UserPreference.findOne({ userId });

      if (!userPref) {
        userPref = new UserPreference({ userId });
      }

      if (type && preferences) {
        userPref.preferences.set(type, preferences);
      }

      if (typeof globalMute === 'boolean') {
        userPref.globalMute = globalMute;
      }

      if (dndMode) {
        userPref.dndMode = { ...userPref.dndMode, ...dndMode };
      }

      await userPref.save();

      res.status(200).json({ success: true, message: 'Preferences updated successfully' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
};
