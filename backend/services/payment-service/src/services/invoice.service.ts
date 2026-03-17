/**
 * @file services/invoice.service.ts
 * @description Generates and emails PDF invoices for bookings.
 */

import { PrismaClient, PaymentStatus } from '@prisma/client';
import { generateInvoicePdf } from '../utils/pdf.util';
import { sendEmail } from '../utils/email.util';
import { PaymentError } from './payment.service';

const prisma = new PrismaClient();

export async function generateAndEmailInvoice(bookingId: string) {
  // Check if invoice already exists
  let invoice = await prisma.invoice.findUnique({ where: { bookingId } });

  if (invoice?.emailedAt) {
    return invoice; // Already emailed
  }

  // Fetch Payment Data
  const payment = await prisma.payment.findFirst({
    where: { bookingId, status: PaymentStatus.SUCCEEDED },
  });

  if (!payment) {
    throw new PaymentError('No successful payment found to generate invoice');
  }

  // Generate Invoice Number
  const invoiceNumber = `INV-${Date.now()}-${bookingId.slice(-6).toUpperCase()}`;

  // If you had a user-service, you'd fetch the user's email here.
  // For now, we simulate this or assume it's passed or stored.
  const customerEmail = `renter-${payment.renterId}@example.com`; // Mock fetching email

  // Generate PDF
  const pdfBuffer = await generateInvoicePdf({
    invoiceId: invoiceNumber,
    date: payment.createdAt,
    bookingNumber: bookingId,
    vehicleTitle: 'Vehicle Rental', // In a real app, fetch from booking-service
    amount: payment.amount,
    currency: payment.currency,
    customerEmail,
  });

  // Save to DB (In a real app, upload pdfBuffer to S3 and save URL)
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        userId: payment.renterId,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  }

  // Send Email
  await sendEmail(
    customerEmail,
    `Your Invoice for Booking ${bookingId}`,
    '<p>Thank you for your rental. Please find your invoice attached.</p>',
    [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
  );

  invoice = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { emailedAt: new Date() },
  });

  return invoice;
}
