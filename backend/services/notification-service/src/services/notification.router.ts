import { UserPreference, IChannelPreference } from '../models/UserPreference';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  userContact?: {
    email?: string;
    phone?: string;
    fcmToken?: string;
  };
}

export class NotificationRouter {
  /**
   * Resolves delivery channels and executes sending based on user settings
   */
  public static async routeNotification(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, body, userContact } = payload;

    // 1. Fetch User Preferences
    const prefs = await UserPreference.findOne({ userId });
    
    // 2. Default preferences if none found
    const channelPrefs: IChannelPreference = prefs?.preferences.get(type) || {
      email: true,
      push: true,
      sms: false,
      whatsapp: false
    };

    // 3. Skip if Global Mute is ON
    if (prefs?.globalMute) {
      console.log(`[NotificationRouter] Skipped: Global Mute is ON for user ${userId}`);
      return;
    }

    // 4. Check DND hours
    if (this.isDndTime(prefs)) {
       console.log(`[NotificationRouter] Skipped: User ${userId} is in DND hours.`);
       return;
    }

    // 5. Fire appropriate channels
    const promises: Promise<any>[] = [];

    if (channelPrefs.email && userContact?.email) {
      promises.push(EmailProvider.sendEmail(userContact.email, title, `<p>${body}</p>`));
    }

    if (channelPrefs.push && userContact?.fcmToken) {
      promises.push(PushProvider.sendPush(userContact.fcmToken, title, body, payload.data));
    }

    if (channelPrefs.sms && userContact?.phone) {
      promises.push(SmsProvider.sendSms(userContact.phone, `${title}: ${body}`));
    }

    if (channelPrefs.whatsapp && userContact?.phone) {
      promises.push(WhatsAppProvider.sendWhatsApp(userContact.phone, body));
    }

    await Promise.allSettled(promises);
  }

  private static isDndTime(prefs: any): boolean {
    if (!prefs?.dndMode.enabled) return false;
    const now = new Date().getHours();
    const { startHour, endHour } = prefs.dndMode;
    
    if (startHour > endHour) {
      // Overnight (e.g. 22 to 7)
      return now >= startHour || now < endHour;
    }
    return now >= startHour && now < endHour;
  }
}
