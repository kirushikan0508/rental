import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin (Mock or Real)
if (!admin.apps.length) {
  try {
    // If you have a service account file:
    // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    
    // For now, allow a mock-like initialization or ignore if not configured strictly
    console.warn('[PushProvider] Firebase Admin not fully configured. Using mock mode.');
  } catch (err) {
    console.error('[PushProvider] Initialization Error:', err);
  }
}

export class PushProvider {
  public static async sendPush(token: string, title: string, body: string, data?: any): Promise<void> {
    const message = {
      notification: { title, body },
      data: data || {},
      token,
    };

    try {
      // await admin.messaging().send(message);
      console.log(`[PushProvider MOCK] Sent Push to ${token}: ${title}`);
    } catch (err) {
      console.error('[PushProvider] Error:', err);
      throw err;
    }
  }
}
