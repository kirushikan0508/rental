/**
 * @file utils/payhere.util.ts
 * @description Local fallback payment gateway (PayHere Sri Lanka) integration logic.
 */

import md5 from 'md5';
import { config } from '../config';

/**
 * Generates the MD5 signature required for PayHere checkout.
 * Format: MD5(merchant_id + order_id + amount_formatted + currency + MD5(merchant_secret))
 */
export function generatePayHereSignature(orderId: string, amount: number, currency: string = 'LKR'): string {
  const amountFormatted = amount.toFixed(2); // must be 2 decimal places
  const hashedSecret = md5(config.payhere.secret).toUpperCase();
  const hashString = `${config.payhere.merchantId}${orderId}${amountFormatted}${currency}${hashedSecret}`;
  return md5(hashString).toUpperCase();
}

/**
 * Validates the webhook signature from PayHere.
 */
export function validatePayHereWebhook(
  merchantId: string,
  orderId: string,
  payhereAmount: string,
  payhereCurrency: string,
  statusCode: string,
  md5sig: string
): boolean {
  const hashedSecret = md5(config.payhere.secret).toUpperCase();
  const localSig = md5(`${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${hashedSecret}`).toUpperCase();
  return localSig === md5sig;
}
