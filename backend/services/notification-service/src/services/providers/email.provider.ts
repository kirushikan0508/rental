import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

export class EmailProvider {
  private static transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '2525'),
    auth: {
      user: process.env.EMAIL_USER || 'mock_user',
      pass: process.env.EMAIL_PASS || 'mock_pass',
    },
  });

  public static async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const mailOptions = {
      from: `"Rental Marketplace" <${process.env.EMAIL_FROM || 'no-reply@rental.com'}>`,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EmailProvider] Sent: ${subject} to ${to}`);
    } catch (err) {
      console.error('[EmailProvider] Error:', err);
      throw err;
    }
  }
}
