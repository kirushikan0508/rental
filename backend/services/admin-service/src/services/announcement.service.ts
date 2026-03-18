import { Announcement, IAnnouncement } from '../models/Announcement';
import { announcementQueue } from '../utils/queue';
import { Types } from 'mongoose';

export class AnnouncementService {
  /**
   * Creates a new announcement and schedules it if a date is provided
   */
  static async createAnnouncement(data: Partial<IAnnouncement>, adminId: string) {
    const announcement = new Announcement({
      ...data,
      createdBy: new Types.ObjectId(adminId),
      status: data.scheduledFor ? 'scheduled' : 'draft',
    });

    await announcement.save();

    if (announcement.status === 'scheduled') {
      await this.scheduleAnnouncement(announcement);
    }

    return announcement;
  }

  /**
   * Immediately publishes an announcement
   */
  static async publishAnnouncement(announcementId: string) {
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) throw new Error('Announcement not found');

    announcement.status = 'published';
    announcement.publishedAt = new Date();
    await announcement.save();

    // Add to queue for immediate delivery
    await announcementQueue.add('deliver-announcement', { announcementId }, { attempts: 3 });

    return announcement;
  }

  /**
   * Schedules an announcement for a future date
   */
  static async scheduleAnnouncement(announcement: IAnnouncement) {
    if (!announcement.scheduledFor) return;

    const delay = announcement.scheduledFor.getTime() - Date.now();
    if (delay > 0) {
      await announcementQueue.add('publish-scheduled-announcement', { announcementId: announcement._id }, { delay });
    } else {
      await this.publishAnnouncement(announcement._id as unknown as string);
    }
  }

  /**
   * Fetches all announcements with filtering
   */
  static async getAnnouncements(filters: any = {}) {
    return Announcement.find(filters).sort({ createdAt: -1 });
  }
}

// Queue Processors
announcementQueue.process('deliver-announcement', async (job) => {
  const { announcementId } = job.data;
  console.log(`ðŸ“¢ Delivering announcement ${announcementId} to users (Mocked Push/Email)`);
  // Here we would integrate with Notification Service or Push Provider
});

announcementQueue.process('publish-scheduled-announcement', async (job) => {
  const { announcementId } = job.data;
  console.log(`ðŸ•’ Publishing scheduled announcement ${announcementId}`);
  await AnnouncementService.publishAnnouncement(announcementId);
});
