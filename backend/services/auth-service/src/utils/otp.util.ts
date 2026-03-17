/**
 * @file utils/otp.util.ts
 * @description Secure OTP code generation using Node.js crypto module.
 */

import crypto from 'crypto';
import { config } from '../config';

/**
 * Generates a cryptographically secure numeric OTP code.
 * Uses `crypto.randomInt` to avoid modulo bias.
 *
 * @param length - Number of digits (defaults to config value)
 * @returns Numeric OTP string (e.g. "482917")
 *
 * @example
 * const otp = generateOtp();   // "748291"
 * const otp4 = generateOtp(4); // "3847"
 */
export function generateOtp(length: number = config.otp.length): string {
  const min = Math.pow(10, length - 1);   // 100000 for 6-digit
  const max = Math.pow(10, length) - 1;   // 999999 for 6-digit
  const code = crypto.randomInt(min, max + 1);
  return code.toString();
}
