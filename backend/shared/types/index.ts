/**
 * @file shared/types/index.ts
 * @description Shared TypeScript interfaces and type definitions
 * used across all microservices in the rental platform.
 */

// ─── Common Response Types ──────────────────────────────────

/** Standard API success response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

/** Standard API error response */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Pagination query parameters */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Auth Types ─────────────────────────────────────────────

/** Decoded JWT payload attached to authenticated requests */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Token pair returned on login / refresh */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Enums ──────────────────────────────────────────────────

export enum UserRole {
  RENTER   = 'RENTER',
  OWNER    = 'OWNER',
  ADMIN    = 'ADMIN',
  SUPPORT  = 'SUPPORT',
  FINANCE  = 'FINANCE',
}

export enum AuthProvider {
  EMAIL  = 'EMAIL',
  GOOGLE = 'GOOGLE',
  OTP    = 'OTP',
}

export enum VehicleType {
  CAR     = 'CAR',
  BIKE    = 'BIKE',
  SCOOTER = 'SCOOTER',
  VAN     = 'VAN',
  SUV     = 'SUV',
  TRUCK   = 'TRUCK',
}

export enum FuelType {
  PETROL   = 'PETROL',
  DIESEL   = 'DIESEL',
  ELECTRIC = 'ELECTRIC',
  HYBRID   = 'HYBRID',
}

export enum Transmission {
  MANUAL    = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
}

export enum VehicleStatus {
  PENDING   = 'PENDING',
  APPROVED  = 'APPROVED',
  REJECTED  = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum BookingStatus {
  PENDING    = 'PENDING',
  CONFIRMED  = 'CONFIRMED',
  ACTIVE     = 'ACTIVE',
  COMPLETED  = 'COMPLETED',
  CANCELLED  = 'CANCELLED',
  DISPUTED   = 'DISPUTED',
}

export enum PricingType {
  HOURLY  = 'HOURLY',
  DAILY   = 'DAILY',
  WEEKLY  = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum PaymentGateway {
  STRIPE  = 'STRIPE',
  PAYHERE = 'PAYHERE',
}

export enum PaymentStatus {
  PENDING            = 'PENDING',
  PROCESSING         = 'PROCESSING',
  SUCCESS            = 'SUCCESS',
  FAILED             = 'FAILED',
  REFUNDED           = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentType {
  BOOKING      = 'BOOKING',
  REFUND       = 'REFUND',
  PAYOUT       = 'PAYOUT',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum MessageType {
  TEXT   = 'TEXT',
  IMAGE  = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export enum MessageStatus {
  SENT      = 'SENT',
  DELIVERED = 'DELIVERED',
  READ      = 'READ',
}

export enum KycStatus {
  PENDING             = 'PENDING',
  UNDER_REVIEW        = 'UNDER_REVIEW',
  APPROVED            = 'APPROVED',
  REJECTED            = 'REJECTED',
  RESUBMIT_REQUIRED   = 'RESUBMIT_REQUIRED',
}

export enum DisputeType {
  DAMAGE    = 'DAMAGE',
  PAYMENT   = 'PAYMENT',
  BEHAVIOUR = 'BEHAVIOUR',
  OTHER     = 'OTHER',
}

export enum DisputeStatus {
  OPEN         = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED     = 'RESOLVED',
  CLOSED       = 'CLOSED',
  ESCALATED    = 'ESCALATED',
}

export enum LoyaltyTransactionType {
  EARN   = 'EARN',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
  ADJUST = 'ADJUST',
}

export enum NotificationType {
  BOOKING  = 'BOOKING',
  PAYMENT  = 'PAYMENT',
  KYC      = 'KYC',
  CHAT     = 'CHAT',
  TRACKING = 'TRACKING',
  PROMO    = 'PROMO',
  SYSTEM   = 'SYSTEM',
  SOS      = 'SOS',
}

export enum NotificationChannel {
  PUSH     = 'PUSH',
  EMAIL    = 'EMAIL',
  SMS      = 'SMS',
  WHATSAPP = 'WHATSAPP',
  IN_APP   = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT    = 'SENT',
  FAILED  = 'FAILED',
  READ    = 'READ',
}

export enum AuditAction {
  LOGIN               = 'LOGIN',
  LOGOUT              = 'LOGOUT',
  REGISTER            = 'REGISTER',
  BOOKING_CREATE      = 'BOOKING_CREATE',
  BOOKING_CANCEL      = 'BOOKING_CANCEL',
  PAYMENT_SUCCESS     = 'PAYMENT_SUCCESS',
  PAYMENT_FAIL        = 'PAYMENT_FAIL',
  VEHICLE_ADD         = 'VEHICLE_ADD',
  VEHICLE_APPROVE     = 'VEHICLE_APPROVE',
  VEHICLE_REJECT      = 'VEHICLE_REJECT',
  KYC_SUBMIT          = 'KYC_SUBMIT',
  KYC_APPROVE         = 'KYC_APPROVE',
  KYC_REJECT          = 'KYC_REJECT',
  USER_SUSPEND        = 'USER_SUSPEND',
  USER_BAN            = 'USER_BAN',
  DISPUTE_OPEN        = 'DISPUTE_OPEN',
  DISPUTE_RESOLVE     = 'DISPUTE_RESOLVE',
  ADMIN_CONFIG_CHANGE = 'ADMIN_CONFIG_CHANGE',
}

export enum FraudFlagType {
  MULTIPLE_ACCOUNTS  = 'MULTIPLE_ACCOUNTS',
  PAYMENT_FAILURE    = 'PAYMENT_FAILURE',
  UNUSUAL_BOOKING    = 'UNUSUAL_BOOKING',
  REPEAT_CANCELLATION = 'REPEAT_CANCELLATION',
  IP_MISMATCH        = 'IP_MISMATCH',
  IDENTITY_MISMATCH  = 'IDENTITY_MISMATCH',
}

export enum FraudStatus {
  FLAGGED   = 'FLAGGED',
  CLEARED   = 'CLEARED',
  ESCALATED = 'ESCALATED',
  BANNED    = 'BANNED',
}

export enum SubscriptionPlan {
  BASIC   = 'BASIC',
  PRO     = 'PRO',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionStatus {
  ACTIVE    = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE  = 'PAST_DUE',
  TRIALING  = 'TRIALING',
}

// ─── GeoJSON Helpers ────────────────────────────────────────

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}
