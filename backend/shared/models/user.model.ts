/**
 * @file user.model.ts
 * @description Mongoose schema for the `users` collection.
 *
 * Stores all platform users — renters, vehicle owners, admins,
 * support agents, and finance officers. Handles multi-provider
 * authentication (email/password, Google OAuth, OTP).
 *
 * @collection users
 * @indexes email (unique), phone (unique), role, isActive+isSuspended
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────

export enum UserRole {
  RENTER  = 'RENTER',
  OWNER   = 'OWNER',
  ADMIN   = 'ADMIN',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
}

export enum AuthProvider {
  EMAIL  = 'EMAIL',
  GOOGLE = 'GOOGLE',
  OTP    = 'OTP',
}

// ─── Interfaces ─────────────────────────────────────────────

export interface IEmergencyContact {
  name: string;
  phone: string;
}

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  authProvider: AuthProvider;
  googleId?: string;
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isSuspended: boolean;
  suspendedReason?: string;
  emergencyContact?: IEmergencyContact;
  fcmToken?: string;
  preferredLanguage: string;
  darkMode: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document<Types.ObjectId> {}

// ─── Schema ─────────────────────────────────────────────────

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    /** Emergency contact full name */
    name:  { type: String, trim: true },
    /** Emergency contact phone number */
    phone: { type: String, trim: true },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    /** User's first name */
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },

    /** User's last name */
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },

    /** Unique email address — used for login and notifications */
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    /** Unique phone number — used for OTP login and SMS */
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },

    /** Bcrypt-hashed password */
    passwordHash: {
      type: String,
      required: function (this: IUserDocument) {
        return this.authProvider === AuthProvider.EMAIL;
      },
      select: false, // exclude from queries by default
    },

    /** User role on the platform */
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.RENTER,
      index: true,
    },

    /** Authentication provider used for registration */
    authProvider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.EMAIL,
    },

    /** Google OAuth ID (only for GOOGLE auth provider) */
    googleId: { type: String, sparse: true },

    /** Profile avatar URL */
    avatar: { type: String },

    /** Whether the user's email has been verified */
    isEmailVerified: { type: Boolean, default: false },

    /** Whether the user's phone has been verified */
    isPhoneVerified: { type: Boolean, default: false },

    /** Whether the user account is active */
    isActive: { type: Boolean, default: true },

    /** Whether the user is suspended by admin */
    isSuspended: { type: Boolean, default: false },

    /** Reason for suspension (set by admin) */
    suspendedReason: { type: String },

    /** Emergency contact details */
    emergencyContact: { type: emergencyContactSchema },

    /** Firebase Cloud Messaging token for push notifications */
    fcmToken: { type: String },

    /** Preferred language code (ISO 639-1) */
    preferredLanguage: { type: String, default: 'en' },

    /** Whether the user prefers dark mode */
    darkMode: { type: Boolean, default: false },

    /** Timestamp of the last successful login */
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ────────────────────────────────────────────────

userSchema.index({ isActive: 1, isSuspended: 1 });

// ─── Virtuals ───────────────────────────────────────────────

userSchema.virtual('fullName').get(function (this: IUserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// ─── Export ─────────────────────────────────────────────────

export const User = model<IUserDocument>('User', userSchema);

/**
 * @sample
 * {
 *   "_id": "65a1b2c3d4e5f6789012abcd",
 *   "firstName": "Kasun",
 *   "lastName": "Perera",
 *   "email": "kasun@example.com",
 *   "phone": "+94771234567",
 *   "role": "RENTER",
 *   "authProvider": "EMAIL",
 *   "isEmailVerified": true,
 *   "isPhoneVerified": true,
 *   "isActive": true,
 *   "isSuspended": false,
 *   "emergencyContact": { "name": "Nimal Perera", "phone": "+94779876543" },
 *   "preferredLanguage": "en",
 *   "darkMode": false,
 *   "lastLoginAt": "2024-01-15T10:30:00.000Z",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 */
