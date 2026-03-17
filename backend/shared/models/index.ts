/**
 * @file shared/models/index.ts
 * @description Barrel exports for all 16 Mongoose models and their associated
 * TypeScript interfaces, enums, and types.
 */

// ─── Models ─────────────────────────────────────────────────

export { User } from './user.model';
export type { IUser, IUserDocument, IEmergencyContact } from './user.model';
export { UserRole, AuthProvider } from './user.model';

export { Vehicle } from './vehicle.model';
export type { IVehicle, IVehicleDocument, IVehiclePricing, IVehicleLocation, IVehicleImage, IVehicleDocuments, IGeofenceZone } from './vehicle.model';
export { VehicleType, FuelType, Transmission, VehicleStatus } from './vehicle.model';

export { Availability } from './availability.model';
export type { IAvailability, IAvailabilityDocument, IBlockedDate, ICustomPricing } from './availability.model';

export { Booking } from './booking.model';
export type { IBooking, IBookingDocument, IBookingPricing, ICancellation, IInsurance, IInspection, ICorporateBooking, IPickupLocation } from './booking.model';
export { BookingStatus, PricingType } from './booking.model';

export { Payment } from './payment.model';
export type { IPayment, IPaymentDocument, IRefund, IPayout, IPaymentMetadata, IWebhookEvent } from './payment.model';
export { PaymentGateway, PaymentStatus, PaymentType } from './payment.model';

export { Review } from './review.model';
export type { IReview, IReviewDocument, IReviewImage, IOwnerReply } from './review.model';

export { Message } from './message.model';
export type { IMessage, IMessageDocument } from './message.model';
export { MessageType, MessageStatus } from './message.model';

export { Conversation } from './conversation.model';
export type { IConversation, IConversationDocument, ILastMessage, IUnreadCount } from './conversation.model';

export { TrackingLog } from './tracking-log.model';
export type { ITrackingLog, ITrackingLogDocument, ITrackingLocation } from './tracking-log.model';

export { KycVerification } from './kyc-verification.model';
export type { IKycVerification, IKycVerificationDocument, INicDocument, ILicenseDocument, ISelfie } from './kyc-verification.model';
export { KycStatus } from './kyc-verification.model';

export { Dispute } from './dispute.model';
export type { IDispute, IDisputeDocument, IEvidence, IResolution, ITimelineEntry } from './dispute.model';
export { DisputeType, DisputeStatus } from './dispute.model';

export { LoyaltyPoints } from './loyalty-points.model';
export type { ILoyaltyPoints, ILoyaltyPointsDocument, ILoyaltyTransaction } from './loyalty-points.model';
export { LoyaltyTransactionType } from './loyalty-points.model';

export { Notification } from './notification.model';
export type { INotification, INotificationDocument } from './notification.model';
export { NotificationType, NotificationChannel, NotificationStatus } from './notification.model';

export { AuditLog } from './audit-log.model';
export type { IAuditLog, IAuditLogDocument } from './audit-log.model';
export { AuditAction } from './audit-log.model';

export { FraudFlag } from './fraud-flag.model';
export type { IFraudFlag, IFraudFlagDocument, IFraudFlagEntry } from './fraud-flag.model';
export { FraudFlagType, FraudStatus } from './fraud-flag.model';

export { Subscription } from './subscription.model';
export type { ISubscription, ISubscriptionDocument } from './subscription.model';
export { SubscriptionPlan, SubscriptionStatus } from './subscription.model';
