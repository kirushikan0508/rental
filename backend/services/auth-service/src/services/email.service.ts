/**
 * @file services/email.service.ts
 * @description Nodemailer-based email service for sending OTP codes,
 * welcome emails, and password reset instructions.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

// ─── Transporter Singleton ──────────────────────────────────

let transporter: Transporter | null = null;

/**
 * Returns the Nodemailer transporter, creating it on first call.
 * Falls back to a console-logging mock in development if SMTP is not configured.
 */
function getTransporter(): Transporter {
  if (!transporter) {
    if (config.smtp.user && config.smtp.pass) {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    } else {
      // Development fallback — log emails to console
      logger.warn('⚠️  SMTP not configured — emails will be logged to console');
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}

// ─── Email Templates ────────────────────────────────────────

/**
 * Generates the HTML body for an OTP email.
 */
function otpEmailTemplate(otp: string, expiryMinutes: number): string {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1a6ef5; margin: 0 0 8px;">Rental Platform</h2>
      <p style="color: #374151; font-size: 16px;">Your one-time verification code is:</p>
      <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">${otp}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        This code expires in <strong>${expiryMinutes} minutes</strong>.
        Do not share this code with anyone.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `;
}

/**
 * Generates the HTML body for a welcome email after registration.
 */
function welcomeEmailTemplate(firstName: string): string {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1a6ef5; margin: 0 0 8px;">Welcome to Rental Platform!</h2>
      <p style="color: #374151; font-size: 16px;">Hi ${firstName},</p>
      <p style="color: #374151; font-size: 16px;">
        Your account has been created successfully. You can now browse vehicles,
        make bookings, and manage your rentals.
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, feel free to contact our support team.
      </p>
      <p style="color: #374151; font-size: 16px;">— The Rental Platform Team</p>
    </div>
  `;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Sends an OTP verification email to the specified address.
 *
 * @param to - Recipient email address
 * @param otp - The OTP code to include in the email
 * @throws Error if email delivery fails
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const expiryMinutes = Math.floor(config.otp.expirySeconds / 60);
  const transport = getTransporter();

  const info = await transport.sendMail({
    from: config.smtp.from,
    to,
    subject: `${otp} — Your Rental Platform verification code`,
    html: otpEmailTemplate(otp, expiryMinutes),
  });

  if (config.smtp.user) {
    logger.info(`📧 OTP email sent to ${to} (messageId: ${info.messageId})`);
  } else {
    // Development: log the rendered email
    logger.info(`📧 [DEV] OTP email for ${to}: ${otp}`);
    logger.debug(`📧 [DEV] Email payload: ${info.message}`);
  }
}

/**
 * Sends a welcome email to newly registered users.
 *
 * @param to - Recipient email address
 * @param firstName - User's first name for personalization
 */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const transport = getTransporter();

  const info = await transport.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Welcome to Rental Platform!',
    html: welcomeEmailTemplate(firstName),
  });

  logger.info(`📧 Welcome email sent to ${to} (messageId: ${info.messageId})`);
}
