/**
 * @file utils/pdf.util.ts
 * @description Generates PDF invoices using PDFKit.
 */

import PDFDocument from 'pdfkit';

export interface InvoiceData {
  invoiceId: string;
  date: Date;
  companyName?: string;
  bookingNumber: string;
  vehicleTitle: string;
  amount: number;
  currency: string;
  customerEmail: string;
}

/**
 * Generates an invoice PDF as a Buffer.
 */
export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.fontSize(10).text(`Invoice Number: ${data.invoiceId}`, { align: 'right' });
      doc.text(`Date: ${data.date.toLocaleDateString()}`, { align: 'right' });
      doc.moveDown(2);

      // From / To
      doc.fontSize(14).text('Vehicle Rental Platform');
      doc.fontSize(10).text('123 Rental Ave, City, Country');
      doc.moveDown();

      doc.fontSize(12).text('Bill To:');
      doc.fontSize(10).text(data.companyName || 'Valued Customer');
      doc.text(data.customerEmail);
      doc.moveDown(2);

      // Table Header
      doc.fontSize(12).text('Description', 50, doc.y, { continued: true });
      doc.text('Amount', 400, doc.y, { align: 'right' });
      doc.moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();
      doc.moveDown(1.5);

      // Line Item
      const displayAmount = (data.amount / 100).toFixed(2);
      doc.fontSize(10).text(`Booking ${data.bookingNumber} - ${data.vehicleTitle}`, 50, doc.y, { continued: true });
      doc.text(`${data.currency.toUpperCase()} ${displayAmount}`, 400, doc.y, { align: 'right' });
      doc.moveDown(2);

      // Total
      doc.moveTo(350, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).text('Total Paid:', 350, doc.y, { continued: true });
      doc.text(`${data.currency.toUpperCase()} ${displayAmount}`, 450, doc.y, { align: 'right' });

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).text('Thank you for your business!', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
