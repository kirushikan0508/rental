/**
 * @file utils/email.util.ts
 * @description Sends emails with optional PDF attachments.
 */

import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Sends an email, potentially with an invoice attached.
 */
export async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]): Promise<void> {
  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
      attachments,
    });
    logger.debug(`Email sent to ${to} for ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}
