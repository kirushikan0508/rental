/**
 * @file review.model.ts
 * @description Mongoose schema for the `reviews` collection.
 *
 * Stores ratings and reviews left by renters after completing a booking.
 * Each booking can have exactly one review. Supports vehicle rating,
 * owner rating, image attachments, owner replies, and admin moderation.
 *
 * @collection reviews
 * @indexes vehicleId+isVisible, ownerId, reviewerId, bookingId(unique)
 */

import { Schema, model, Document, Types } from 'mongoose';

// ─── Interfaces ─────────────────────────────────────────────

export interface IReviewImage {
  url: string;
  key: string;
}

export interface IOwnerReply {
  comment: string;
  repliedAt: Date;
}

export interface IReview {
  bookingId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  ownerId: Types.ObjectId;
  vehicleRating: number;
  ownerRating: number;
  comment: string;
  images: IReviewImage[];
  isVisible: boolean;
  adminHidden: boolean;
  adminHiddenReason?: string;
  ownerReply?: IOwnerReply;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewDocument extends IReview, Document<Types.ObjectId> {}

// ─── Sub-Schemas ────────────────────────────────────────────

const reviewImageSchema = new Schema<IReviewImage>(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
  },
  { _id: false },
);

const ownerReplySchema = new Schema<IOwnerReply>(
  {
    /** Owner's reply text */
    comment:   { type: String, required: true, maxlength: 1000 },
    /** When the owner replied */
    repliedAt: { type: Date, required: true },
  },
  { _id: false },
);

// ─── Main Schema ────────────────────────────────────────────

const reviewSchema = new Schema<IReviewDocument>(
  {
    /** Associated booking (one review per booking) */
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true,
    },

    /** User who wrote the review (renter) */
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer ID is required'],
      index: true,
    },

    /** Reviewed vehicle */
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },

    /** Vehicle owner */
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },

    /** Rating for the vehicle (1-5) */
    vehicleRating: {
      type: Number,
      required: [true, 'Vehicle rating is required'],
      min: 1,
      max: 5,
    },

    /** Rating for the owner (1-5) */
    ownerRating: {
      type: Number,
      required: [true, 'Owner rating is required'],
      min: 1,
      max: 5,
    },

    /** Review comment text */
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: 2000,
    },

    /** Attached images (up to 5) */
    images: {
      type: [reviewImageSchema],
      validate: [(v: IReviewImage[]) => v.length <= 5, 'Maximum 5 images allowed'],
    },

    /** Whether the review is visible to other users */
    isVisible: { type: Boolean, default: true },

    /** Whether an admin has hidden this review */
    adminHidden: { type: Boolean, default: false },

    /** Reason the admin hid the review */
    adminHiddenReason: { type: String },

    /** Owner's reply to the review */
    ownerReply: { type: ownerReplySchema },

    /** Number of "helpful" votes from other users */
    helpfulCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────

reviewSchema.index({ vehicleId: 1, isVisible: 1 });

// ─── Export ─────────────────────────────────────────────────

export const Review = model<IReviewDocument>('Review', reviewSchema);

/**
 * @sample
 * {
 *   "_id": "65e5f6789012ab34ef567890",
 *   "bookingId": "65c3d4e5f6789012ab34ef01",
 *   "reviewerId": "65a1b2c3d4e5f6789012abcd",
 *   "vehicleId": "65a1b2c3d4e5f6789012efgh",
 *   "ownerId": "65a1b2c3d4e5f6789012wxyz",
 *   "vehicleRating": 5,
 *   "ownerRating": 4,
 *   "comment": "Excellent vehicle, well maintained. Owner was responsive and helpful.",
 *   "images": [{ "url": "https://cdn.example.com/review1.jpg", "key": "review1.jpg" }],
 *   "isVisible": true,
 *   "adminHidden": false,
 *   "ownerReply": { "comment": "Thank you! Glad you enjoyed the ride.", "repliedAt": "2024-02-05T10:00:00.000Z" },
 *   "helpfulCount": 3,
 *   "createdAt": "2024-02-04T08:00:00.000Z",
 *   "updatedAt": "2024-02-05T10:00:00.000Z"
 * }
 */
