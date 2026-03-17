/**
 * @file models/index.ts
 * @description Barrel exports for all Mongoose models.
 */

export { Booking, BookingStatus, PricingType } from './booking.model';
export type { IBooking, BookingStatusType, PricingTypeValue } from './booking.model';

export { Inspection } from './inspection.model';
export type { IInspection } from './inspection.model';

export { Dispute, DisputeStatus } from './dispute.model';
export type { IDispute, DisputeStatusType } from './dispute.model';

export {
  LoyaltyTransaction,
  LoyaltyBalance,
} from './loyalty.model';
export type { ILoyaltyTransaction, ILoyaltyBalance } from './loyalty.model';
