import { NotificationRouter, NotificationPayload } from '../notification.router';
import { UserPreference } from '../../models/UserPreference';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';

jest.mock('../../models/UserPreference');
jest.mock('../providers/email.provider');
jest.mock('../providers/sms.provider');
jest.mock('../providers/push.provider');
jest.mock('../providers/whatsapp.provider');

describe('NotificationRouter', () => {
  const mockPayload: NotificationPayload = {
    userId: 'user_1',
    type: 'BOOKING_CONFIRMED',
    title: 'Confirmed',
    body: 'Your booking is ready',
    userContact: {
      email: 'user@example.com',
      phone: '+1234567890'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send via email by default if no preferences exist', async () => {
    (UserPreference.findOne as jest.Mock).mockResolvedValue(null);

    await NotificationRouter.routeNotification(mockPayload);

    expect(EmailProvider.sendEmail).toHaveBeenCalled();
    // Default push is true, but no FCM token in payload. Default SMS is false.
    expect(SmsProvider.sendSms).not.toHaveBeenCalled();
  });

  it('should respect global mute', async () => {
    (UserPreference.findOne as jest.Mock).mockResolvedValue({
      globalMute: true,
      preferences: new Map()
    });

    await NotificationRouter.routeNotification(mockPayload);

    expect(EmailProvider.sendEmail).not.toHaveBeenCalled();
  });

  it('should respects DND hours', async () => {
    // Current hour is usually handled by Date().getHours() in implementation
    // For testing, we mock the hour or the isDndTime logic if possible, 
    // or just assume the implementation works and we test the branch.
    
    // Let's assume start 0, end 24 (Always DND)
    (UserPreference.findOne as jest.Mock).mockResolvedValue({
      globalMute: false,
      dndMode: { enabled: true, startHour: 0, endHour: 24 },
      preferences: new Map()
    });

    await NotificationRouter.routeNotification(mockPayload);

    expect(EmailProvider.sendEmail).not.toHaveBeenCalled();
  });

  it('should respect granular channel preferences', async () => {
     const prefsMap = new Map();
     prefsMap.set('BOOKING_CONFIRMED', { email: false, sms: true, push: false, whatsapp: false });

     (UserPreference.findOne as jest.Mock).mockResolvedValue({
        globalMute: false,
        dndMode: { enabled: false },
        preferences: prefsMap
     });

     await NotificationRouter.routeNotification(mockPayload);

     expect(EmailProvider.sendEmail).not.toHaveBeenCalled();
     expect(SmsProvider.sendSms).toHaveBeenCalled();
  });
});
