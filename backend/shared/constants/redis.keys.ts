/**
 * @file redis.keys.ts
 * @description Redis key pattern definitions and helper functions.
 *
 * Centralizes all Redis key patterns used across microservices
 * with TTL constants, type-safe key builders, and documentation.
 *
 * Key Naming Convention: `{domain}:{identifier}:{sub-key}`
 */

// ═══════════════════════════════════════════════════════════
// TTL Constants (in seconds)
// ═══════════════════════════════════════════════════════════

export const TTL = {
  /** 5 minutes */
  FIVE_MIN:     5 * 60,
  /** 10 minutes */
  TEN_MIN:      10 * 60,
  /** 15 minutes */
  FIFTEEN_MIN:  15 * 60,
  /** 1 minute */
  ONE_MIN:      60,
  /** 2 minutes */
  TWO_MIN:      2 * 60,
  /** 1 hour */
  ONE_HOUR:     60 * 60,
  /** 7 days */
  SEVEN_DAYS:   7 * 24 * 60 * 60,
} as const;

// ═══════════════════════════════════════════════════════════
// Sessions & Auth
// ═══════════════════════════════════════════════════════════

/**
 * `session:{userId}` → JWT refresh token
 * TTL: 7 days
 */
export const sessionKey = (userId: string): string =>
  `session:${userId}`;

/**
 * `otp:{identifier}` → OTP code (phone or email)
 * TTL: 5 minutes
 */
export const otpKey = (identifier: string): string =>
  `otp:${identifier}`;

/**
 * `login_attempts:{ip}` → failed login attempt count
 * TTL: 15 minutes
 */
export const loginAttemptsKey = (ip: string): string =>
  `login_attempts:${ip}`;

/**
 * `blacklist:{token}` → invalidated JWT token
 * TTL: equals remaining token validity (max 15 min)
 */
export const blacklistKey = (token: string): string =>
  `blacklist:${token}`;

// ═══════════════════════════════════════════════════════════
// Booking Locks
// ═══════════════════════════════════════════════════════════

/**
 * `booking_lock:{vehicleId}:{date}` → distributed lock
 * Prevents double-booking for the same vehicle on the same date.
 * TTL: 5 minutes
 */
export const bookingLockKey = (vehicleId: string, date: string): string =>
  `booking_lock:${vehicleId}:${date}`;

// ═══════════════════════════════════════════════════════════
// Live Location / Tracking
// ═══════════════════════════════════════════════════════════

/**
 * `location:{vehicleId}` → { lat, lng, updatedAt }
 * Latest GPS position of a vehicle during an active booking.
 * TTL: 10 minutes
 */
export const locationKey = (vehicleId: string): string =>
  `location:${vehicleId}`;

/**
 * `tracking_authorized:{bookingId}` → Set of authorized user IDs
 * Users permitted to view live tracking for this booking.
 * No TTL — removed when booking ends.
 */
export const trackingAuthorizedKey = (bookingId: string): string =>
  `tracking_authorized:${bookingId}`;

// ═══════════════════════════════════════════════════════════
// Rate Limiting
// ═══════════════════════════════════════════════════════════

/**
 * `rate:{ip}:{endpoint}` → request count
 * IP-based rate limiting per endpoint.
 * TTL: 1 minute
 */
export const rateLimitKey = (ip: string, endpoint: string): string =>
  `rate:${ip}:${endpoint}`;

/**
 * `rate_user:{userId}:{endpoint}` → user request count
 * User-based rate limiting per endpoint.
 * TTL: 1 minute
 */
export const rateLimitUserKey = (userId: string, endpoint: string): string =>
  `rate_user:${userId}:${endpoint}`;

// ═══════════════════════════════════════════════════════════
// Caching
// ═══════════════════════════════════════════════════════════

/**
 * `vehicle:{vehicleId}` → full vehicle document (JSON)
 * TTL: 10 minutes
 */
export const vehicleCacheKey = (vehicleId: string): string =>
  `vehicle:${vehicleId}`;

/**
 * `search:{queryHash}` → search results (JSON)
 * Hash of query parameters for deduplication.
 * TTL: 2 minutes
 */
export const searchCacheKey = (queryHash: string): string =>
  `search:${queryHash}`;

/**
 * `owner_earnings:{ownerId}` → earnings summary (JSON)
 * TTL: 1 hour
 */
export const ownerEarningsKey = (ownerId: string): string =>
  `owner_earnings:${ownerId}`;

/**
 * `platform_config` → admin platform configuration (JSON)
 * TTL: 1 hour
 */
export const PLATFORM_CONFIG_KEY = 'platform_config';

// ═══════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════

/**
 * `notif_queue:{userId}` → list of pending notifications
 * Consumed by the notification worker.
 */
export const notifQueueKey = (userId: string): string =>
  `notif_queue:${userId}`;

/**
 * `fcm_token:{userId}` → Firebase Cloud Messaging device token
 */
export const fcmTokenKey = (userId: string): string =>
  `fcm_token:${userId}`;

// ═══════════════════════════════════════════════════════════
// Key Patterns Reference (for monitoring/cleanup)
// ═══════════════════════════════════════════════════════════

export const KEY_PATTERNS = {
  sessions:           'session:*',
  otps:               'otp:*',
  loginAttempts:      'login_attempts:*',
  blacklist:          'blacklist:*',
  bookingLocks:       'booking_lock:*',
  locations:          'location:*',
  trackingAuth:       'tracking_authorized:*',
  rateLimitIP:        'rate:*',
  rateLimitUser:      'rate_user:*',
  vehicleCache:       'vehicle:*',
  searchCache:        'search:*',
  ownerEarnings:      'owner_earnings:*',
  notifQueues:        'notif_queue:*',
  fcmTokens:          'fcm_token:*',
} as const;
