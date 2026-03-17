/**
 * @file audit-log.model.ts
 * @description Mongoose schema for the `audit_logs` collection.
 *
 * Immutable log of all significant actions performed on the platform.
 * Used for compliance, debugging, and admin investigations.
 * Auto-expires after 1 year via TTL index.
 *
 * @collection audit_logs
 * @indexes userId+action, action+createdAt, targetId+targetModel
 * @ttl 1 year (createdAt)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

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

// ─── Interfaces ─────────────────────────────────────────────

export interface IAuditLog {
  userId: Types.ObjectId;
  action: AuditAction;
  targetId?: Types.ObjectId;
  targetModel?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document<Types.ObjectId> {}

// ─── Main Schema ────────────────────────────────────────────

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    /** User who performed the action */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    /** The action that was performed */
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: [true, 'Action is required'],
    },

    /** ID of the target document (e.g., bookingId, vehicleId) */
    targetId: { type: Schema.Types.ObjectId },

    /** Mongoose model name of the target (e.g., "Booking", "Vehicle") */
    targetModel: { type: String },

    /** Client IP address */
    ipAddress: { type: String },

    /** Client user-agent string */
    userAgent: { type: String },

    /** Device identifier or type */
    device: { type: String },

    /** Arbitrary metadata for the action */
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // audit logs are immutable
  },
);

// ─── Indexes ────────────────────────────────────────────────

auditLogSchema.index({ userId: 1, action: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, targetModel: 1 });

/** TTL index — auto-delete audit logs after 1 year */
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ─── Export ─────────────────────────────────────────────────

export const AuditLog = model<IAuditLogDocument>('AuditLog', auditLogSchema);

/**
 * @sample
 * {
 *   "_id": "65l2ab34ef567890ab1234567",
 *   "userId": "65a1b2c3d4e5f6789012abcd",
 *   "action": "BOOKING_CREATE",
 *   "targetId": "65c3d4e5f6789012ab34ef01",
 *   "targetModel": "Booking",
 *   "ipAddress": "192.168.1.100",
 *   "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
 *   "device": "desktop",
 *   "metadata": { "bookingRef": "BK-M2K4A1-X7B9", "vehicleId": "65a1b2c3d4e5f6789012efgh" },
 *   "createdAt": "2024-01-28T14:00:00.000Z"
 * }
 */
