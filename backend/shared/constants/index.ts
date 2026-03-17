/**
 * @file shared/constants/index.ts
 * @description Shared constants used across all microservices.
 */

// ─── Re-export all enums as constants ───────────────────────
export {
  UserRole,
  AuthProvider,
  VehicleType,
  FuelType,
  Transmission,
  VehicleStatus,
  BookingStatus,
  PricingType,
  PaymentGateway,
  PaymentStatus,
  PaymentType,
  MessageType,
  MessageStatus,
  KycStatus,
  DisputeType,
  DisputeStatus,
  LoyaltyTransactionType,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  AuditAction,
  FraudFlagType,
  FraudStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../types';

// ─── Application Constants ──────────────────────────────────

/** Maximum file upload size in bytes (10 MB) */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/** Supported image MIME types */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Default pagination values */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Booking constraints */
export const MIN_BOOKING_HOURS = 1;
export const MAX_BOOKING_DAYS = 90;

/** Rating constraints */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** OTP configuration */
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 300; // 5 minutes
export const MAX_OTP_ATTEMPTS = 5;

/** Password policy */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Commission rates by subscription plan (percentage) */
export const COMMISSION_RATES: Record<string, number> = {
  BASIC:   15,
  PRO:     10,
  PREMIUM:  5,
} as const;

/** Platform fee (percentage) */
export const PLATFORM_FEE_PERCENT = 3;

/** Supported currencies */
export const SUPPORTED_CURRENCIES = ['USD', 'LKR', 'EUR', 'GBP'] as const;
export const DEFAULT_CURRENCY = 'USD';
