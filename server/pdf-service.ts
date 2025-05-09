import PDFDocument from 'pdfkit';
import { BookingWithDetails } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { storage } from './storage';

// Generate receipt PDF for a booking
export async function generateReceiptPdf(booking: BookingWithDetails): Promise<string> {
  // Get payment accounts for tax and fee rates
  const paymentAccounts = await storage.getPaymentAccounts();
  const paymentAccount = paymentAccounts.length > 0 ? paymentAccounts[0] : null;
  
  // Use dynamic rates from payment account settings, or fall back to defaults
  const taxRate = paymentAccount?.taxRate ?? 0.13; // Default to 13% if not set
  const serviceFeeRate = paymentAccount?.serviceFeeRate ?? 0.04; // Default to 4% if not set
  
  return new Promise((resolve, reject) => {
    try {
      // Ensure the receipts directory exists
      const receiptsDir = path.join(process.cwd(), 'uploads', 'receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      
      // Create a unique filename for the receipt
      const filename = `receipt-${booking.id}-${Date.now()}.pdf`;
      const filepath = path.join(receiptsDir, filename);
      
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });
      
      // Pipe the PDF to a write stream
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      
      // Add booking details to the PDF
      const { flight, user } = booking;
      
      // Add logo and header with theme color
      doc
        .fillColor('#3b82f6') // Use the theme blue color
        .fontSize(25)
        .text('SkyBooker', { align: 'center' })
        .fontSize(15)
        .text('Flight Booking Receipt', { align: 'center' })
        .fillColor('#000000') // Reset to black for the rest of the text
        .moveDown();
      
      // Add a horizontal line
      doc
        .strokeColor('#3b82f6')
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke()
        .moveDown();
      
      // Receipt details
      doc
        .fontSize(12)
        .text('Receipt ID:', { continued: true })
        .fontSize(12)
        .text(`  ${booking.id}-${Date.now().toString().slice(-6)}`, { align: 'right' })
        .text('Date:', { continued: true })
        .text(`  ${new Date().toLocaleDateString()}`, { align: 'right' })
        .moveDown();
      
      // Customer details
      doc
        .fillColor('#3b82f6') // Theme color for section headers
        .fontSize(14)
        .text('Customer Details')
        .fillColor('#000000') // Reset to black
        .moveDown(0.5);
      
      doc
        .fontSize(10)
        .text('Name:', { continued: true, indent: 10 })
        .text(`  ${booking.passengerFirstName} ${booking.passengerLastName}`, { align: 'right' })
        .text('Email:', { continued: true, indent: 10 })
        .text(`  ${booking.passengerEmail}`, { align: 'right' })
        .moveDown();
      
      // Flight details
      doc
        .fillColor('#3b82f6') // Theme color for section headers
        .fontSize(14)
        .text('Flight Details')
        .fillColor('#000000') // Reset to black
        .moveDown(0.5);
      
      doc
        .fontSize(10)
        .text('Flight:', { continued: true, indent: 10 })
        .text(`  ${flight.origin.code} to ${flight.destination.code}`, { align: 'right' })
        .text('From:', { continued: true, indent: 10 })
        .text(`  ${flight.origin.city}, ${flight.origin.country}`, { align: 'right' })
        .text('To:', { continued: true, indent: 10 })
        .text(`  ${flight.destination.city}, ${flight.destination.country}`, { align: 'right' })
        .text('Departure:', { continued: true, indent: 10 })
        .text(`  ${new Date(flight.departureTime).toLocaleString()}`, { align: 'right' })
        .text('Arrival:', { continued: true, indent: 10 })
        .text(`  ${new Date(flight.arrivalTime).toLocaleString()}`, { align: 'right' })
        .moveDown();
      
      // Payment details
      doc
        .fillColor('#3b82f6') // Theme color for section headers
        .fontSize(14)
        .text('Payment Details')
        .fillColor('#000000') // Reset to black
        .moveDown(0.5);
      
      doc
        .fontSize(10)
        .text('Payment Status:', { continued: true, indent: 10 })
        .text(`  ${booking.status}`, { align: 'right' })
        .text('Payment Reference:', { continued: true, indent: 10 })
        .text(`  ${booking.paymentReference || 'N/A'}`, { align: 'right' });
      
      const taxesAndFees = flight.price * taxRate;
      const serviceFee = flight.price * serviceFeeRate;
      const totalAmount = flight.price + taxesAndFees + serviceFee;
      
      // Price breakdown
      doc.moveDown()
        .fontSize(10)
        .text('Base Fare:', { continued: true, indent: 10 })
        .text(`  $${flight.price.toFixed(2)}`, { align: 'right' })
        .text('Taxes & Fees:', { continued: true, indent: 10 })
        .text(`  $${taxesAndFees.toFixed(2)}`, { align: 'right' })
        .text('Service Fee:', { continued: true, indent: 10 })
        .text(`  $${serviceFee.toFixed(2)}`, { align: 'right' });
      
      // Draw a line before total
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(doc.page.width - 150, doc.y + 10)
        .lineTo(doc.page.width - 50, doc.y + 10)
        .stroke();
      
      doc
        .moveDown(0.5)
        .fontSize(12)
        .fillColor('#3b82f6') // Theme color for total amount
        .text('Total Amount:', { continued: true, indent: 10, bold: true })
        .text(`  $${totalAmount.toFixed(2)}`, { align: 'right', bold: true })
        .fillColor('#000000'); // Reset to black
      
      // Footer
      doc
        .moveDown(2)
        .strokeColor('#3b82f6')
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke()
        .moveDown();
      
      doc
        .fontSize(10)
        .fillColor('#3b82f6') // Theme color for the thank you message
        .text('Thank you for choosing SkyBooker for your travel needs.', { align: 'center' })
        .fillColor('#666666') // Light gray for less important text
        .text('This is an electronically generated receipt and does not require a signature.', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
      // When the stream is closed, resolve with the path
      stream.on('finish', () => {
        const webPath = `/uploads/receipts/${filename}`;
        resolve(webPath);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}