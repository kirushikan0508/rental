/**
 * @file services/otp.service.ts
 * @description OTP lifecycle management — generation, storage in Redis,
 * verification, resend with rate limiting.
 */

import { generateOtp } from '../utils/otp.util';
import {
  storeOtp,
  getOtp,
  deleteOtp,
  isOtpCooldown,
  setOtpCooldown,
} from '../utils/redis.util';
import { sendOtpEmail } from './email.service';
import { logger } from '../utils/logger';

// ─── Public API ─────────────────────────────────────────────

/**
 * Generates a new OTP, stores it in Redis, and sends it via email.
 * Enforces a 60-second cooldown between resends.
 *
 * @param identifier - The email address (or phone number) to send the OTP to
 * @throws Error if OTP is still in cooldown period
 */
export async function requestOtp(identifier: string): Promise<void> {
  // Check cooldown to prevent spam
  const onCooldown = await isOtpCooldown(identifier);
  if (onCooldown) {
    throw new OtpError('OTP was recently sent. Please wait 60 seconds before requesting again.');
  }

  // Generate and store OTP
  const otp = generateOtp();
  await storeOtp(identifier, otp);
  await setOtpCooldown(identifier);

  logger.info(`🔑 OTP generated for ${maskIdentifier(identifier)}`);

  // Send via email (extend for SMS later)
  if (identifier.includes('@')) {
    await sendOtpEmail(identifier, otp);
  } else {
    // TODO: Implement SMS sending via Twilio or similar
    logger.info(`📱 [SMS] OTP for ${maskIdentifier(identifier)}: ${otp}`);
  }
}

/**
 * Verifies an OTP code against the stored value in Redis.
 * Deletes the OTP on successful verification (single-use).
 *
 * @param identifier - The email or phone the OTP was sent to
 * @param code - The OTP code entered by the user
 * @returns true if the OTP is valid
 * @throws OtpError if the OTP is expired, invalid, or missing
 */
export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  const storedOtp = await getOtp(identifier);

  // OTP expired or never generated
  if (!storedOtp) {
    throw new OtpError('OTP has expired or was not requested. Please request a new one.');
  }

  // OTP mismatch
  if (storedOtp !== code) {
    throw new OtpError('Invalid OTP code. Please try again.');
  }

  // Valid — delete to prevent reuse
  await deleteOtp(identifier);
  logger.info(`✅ OTP verified for ${maskIdentifier(identifier)}`);
  return true;
}

/**
 * Resends an OTP to the given identifier.
 * Alias for `requestOtp` with the same cooldown enforcement.
 *
 * @param identifier - Email or phone number
 */
export async function resendOtp(identifier: string): Promise<void> {
  return requestOtp(identifier);
}

// ─── Helpers ────────────────────────────────────────────────

/** Masks an identifier for safe logging (e.g. "k***@example.com") */
function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    const [local, domain] = identifier.split('@');
    return `${local[0]}***@${domain}`;
  }
  // Phone: show last 4 digits
  return `***${identifier.slice(-4)}`;
}

// ─── Custom Error ───────────────────────────────────────────

/** Custom error class for OTP-related failures */
export class OtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpError';
  }
}
