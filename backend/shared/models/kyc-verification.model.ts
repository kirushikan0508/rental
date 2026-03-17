/**
 * @file kyc-verification.model.ts
 * @description Mongoose schema for the `kyc_verifications` collection.
 *
 * Stores identity verification documents (NIC, driving license, selfie)
 * submitted by users. Supports admin review, automated scoring,
 * resubmission workflow, and encrypted document numbers.
 *
 * @collection kyc_verifications
 * @indexes userId(unique), status
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum KycStatus {
  PENDING           = 'PENDING',
  UNDER_REVIEW      = 'UNDER_REVIEW',
  APPROVED          = 'APPROVED',
  REJECTED          = 'REJECTED',
  RESUBMIT_REQUIRED = 'RESUBMIT_REQUIRED',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IDocumentImage {
  url: string;
  key: string;
}

export interface INicDocument {
  number: string;           // encrypted at-rest
  frontImage: IDocumentImage;
  backImage: IDocumentImage;
  verified: boolean;
  verifiedAt?: Date;
}

export interface ILicenseDocument {
  number: string;           // encrypted at-rest
  frontImage: IDocumentImage;
  backImage: IDocumentImage;
  expiryDate: Date;
  verified: boolean;
  verifiedAt?: Date;
}

export interface ISelfie {
  url: string;
  key: string;
  matchScore: number;       // AI face-match score (0-100)
  verified: boolean;
}

export interface IKycVerification {
  userId: Types.ObjectId;
  nic: INicDocument;
  license: ILicenseDocument;
  selfie: ISelfie;
  status: KycStatus;
  rejectionReason?: string;
  resubmitNote?: string;
  verifiedBy?: Types.ObjectId;
  autoVerificationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKycVerificationDocument extends IKycVerification, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const documentImageSchema = new Schema<IDocumentImage>(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
  },
  { _id: false },
);

const nicDocumentSchema = new Schema<INicDocument>(
  {
    /** NIC number (encrypted at-rest) */
    number:     { type: String, required: true },
    frontImage: { type: documentImageSchema, required: true },
    backImage:  { type: documentImageSchema, required: true },
    verified:   { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { _id: false },
);

const licenseDocumentSchema = new Schema<ILicenseDocument>(
  {
    /** Driving license number (encrypted at-rest) */
    number:     { type: String, required: true },
    frontImage: { type: documentImageSchema, required: true },
    backImage:  { type: documentImageSchema, required: true },
    expiryDate: { type: Date, required: true },
    verified:   { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { _id: false },
);

const selfieSchema = new Schema<ISelfie>(
  {
    url:        { type: String, required: true },
    key:        { type: String, required: true },
    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    verified:   { type: Boolean, default: false },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const kycVerificationSchema = new Schema<IKycVerificationDocument>(
  {
    /** User being verified (one KYC doc per user) */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },

    /** National Identity Card document */
    nic: { type: nicDocumentSchema },

    /** Driving license document */
    license: { type: licenseDocumentSchema },

    /** Selfie for face-matching */
    selfie: { type: selfieSchema },

    /** Current KYC verification status */
    status: {
      type: String,
      enum: Object.values(KycStatus),
      default: KycStatus.PENDING,
      index: true,
    },

    /** Reason for rejection (set by admin) */
    rejectionReason: { type: String },

    /** Note to user about what to resubmit */
    resubmitNote: { type: String },

    /** Admin who performed the verification */
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    /** Automated verification confidence score (0-100) */
    autoVerificationScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  {
    timestamps: true,
  },
);

// ─── Export ─────────────────────────────────────────────────

export const KycVerification = model<IKycVerificationDocument>('KycVerification', kycVerificationSchema);

/**
 * @sample
 * {
 *   "_id": "65h89012ab34ef567890ab12",
 *   "userId": "65a1b2c3d4e5f6789012abcd",
 *   "nic": {
 *     "number": "ENC:xxxx-xxxx-xxxx",
 *     "frontImage": { "url": "https://cdn.example.com/nic-front.jpg", "key": "nic-front.jpg" },
 *     "backImage": { "url": "https://cdn.example.com/nic-back.jpg", "key": "nic-back.jpg" },
 *     "verified": true,
 *     "verifiedAt": "2024-01-10T12:00:00.000Z"
 *   },
 *   "license": {
 *     "number": "ENC:yyyy-yyyy-yyyy",
 *     "frontImage": { "url": "https://cdn.example.com/dl-front.jpg", "key": "dl-front.jpg" },
 *     "backImage": { "url": "https://cdn.example.com/dl-back.jpg", "key": "dl-back.jpg" },
 *     "expiryDate": "2026-12-31T00:00:00.000Z",
 *     "verified": true,
 *     "verifiedAt": "2024-01-10T12:00:00.000Z"
 *   },
 *   "selfie": {
 *     "url": "https://cdn.example.com/selfie.jpg", "key": "selfie.jpg",
 *     "matchScore": 92, "verified": true
 *   },
 *   "status": "APPROVED",
 *   "verifiedBy": "65a1b2c3d4e5f6789012admin",
 *   "autoVerificationScore": 88,
 *   "createdAt": "2024-01-05T00:00:00.000Z",
 *   "updatedAt": "2024-01-10T12:00:00.000Z"
 * }
 */
