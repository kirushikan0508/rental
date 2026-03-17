export class WhatsAppProvider {
  /**
   * Sending WhatsApp messages via Twilio or Meta WhatsApp Business API
   * Currently a Mock implementation
   */
  public static async sendWhatsApp(to: string, body: string): Promise<void> {
    console.log(`[WhatsAppProvider MOCK] Sending to ${to}: ${body}`);
    // Real implementation (Twilio):
    // const client = twilio(sid, token);
    // await client.messages.create({ from: 'whatsapp:+...', body, to: `whatsapp:${to}` });
  }
}
