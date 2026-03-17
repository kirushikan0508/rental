import twilio from 'twilio';
import * as dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_MOCK_SID';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'MOCK_TOKEN';
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

export class SmsProvider {
  private static client = twilio(accountSid, authToken);

  public static async sendSms(to: string, body: string): Promise<void> {
    try {
      if (accountSid === 'AC_MOCK_SID') {
        console.log(`[SmsProvider STUB] Sending to ${to}: ${body}`);
        return;
      }
      await this.client.messages.create({
        body,
        from: fromNumber,
        to,
      });
      console.log(`[SmsProvider] Sent SMS to ${to}`);
    } catch (err) {
      console.error('[SmsProvider] Error:', err);
      throw err;
    }
  }
}
