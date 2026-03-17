/**
 * @file services/corporate.service.ts
 * @description Handles corporate bookings and invoicing.
 */

import { Booking } from '../models';

/**
 * Generates an invoice format for a specific corporate booking.
 */
export async function generateInvoice(bookingId: string) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (!booking.isCorporate) throw new Error('Not a corporate booking');

  // Simple invoice structure logic
  const invoice = {
    invoiceId: booking.invoiceId || `INV-${booking.bookingNumber}`,
    date: new Date(),
    company: {
      id: booking.companyId,
      name: booking.companyName,
    },
    bookingDetails: {
      bookingNumber: booking.bookingNumber,
      vehicle: booking.vehicleTitle,
      period: `${booking.startDate.toISOString()} to ${booking.endDate.toISOString()}`,
    },
    billing: {
      subtotal: booking.subtotal,
      insurance: booking.insuranceFee,
      discount: booking.corporateDiscount,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
    },
    status: booking.status === 'COMPLETED' ? 'PAID' : 'DUE',
  };

  return invoice;
}

/**
 * Gets monthly summary for a company.
 */
export async function getMonthlySummary(companyId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const bookings = await Booking.find({
    companyId,
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: ['COMPLETED', 'CONFIRMED', 'ACTIVE'] },
  });

  const totalSpent = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalBookings = bookings.length;

  return { year, month, totalBookings, totalSpent, bookings };
}
