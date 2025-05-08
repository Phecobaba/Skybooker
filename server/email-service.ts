import nodemailer from 'nodemailer';
import { Booking, BookingWithDetails, User } from '@shared/schema';
import { generateReceiptPdf } from './pdf-service';
import path from 'path';
import fs from 'fs';

// Create a test account or use environment variables in production
let transporter: nodemailer.Transporter;

// Initialize the email transporter
export async function initializeEmailService() {
  // Check if Mailjet API keys are available
  if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
    try {
      // Setup using Mailjet SMTP relay
      transporter = nodemailer.createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAILJET_API_KEY,
          pass: process.env.MAILJET_SECRET_KEY
        }
      });
      
      console.log('Email service initialized with Mailjet');
      return transporter;
    } catch (error) {
      console.error('Failed to initialize Mailjet email service:', error);
      // Fall back to test account if Mailjet setup fails
    }
  }
  
  // For testing, we'll use ethereal email (a fake SMTP service)
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    // Create a transporter object
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('Email service initialized with test account');
    console.log(`Test email account: ${testAccount.user}`);
    console.log(`Preview URL: https://ethereal.email/login`);
    console.log(`(Use the test email and password to login and view sent emails)`);
    
    return transporter;
  } catch (error) {
    console.error('Failed to initialize test email service:', error);
    throw error;
  }
}

// Function to send booking confirmation email
export async function sendBookingConfirmationEmail(booking: BookingWithDetails) {
  if (!transporter) {
    await initializeEmailService();
  }
  
  try {
    const { user, flight } = booking;
    
    const mailOptions = {
      from: '"SkyBooker" <bookings@skybooker.com>',
      to: booking.passengerEmail,
      subject: `Booking Confirmation - Flight ${flight.origin.code} to ${flight.destination.code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Your Flight is Booked!</h2>
          <p>Dear ${booking.passengerFirstName} ${booking.passengerLastName},</p>
          <p>Thank you for booking with SkyBooker. Your booking has been confirmed.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a;">Booking Details</h3>
            <p><strong>Booking Reference:</strong> ${booking.id}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
            <p><strong>Flight:</strong> From ${flight.origin.city} (${flight.origin.code}) to ${flight.destination.city} (${flight.destination.code})</p>
            <p><strong>Departure:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
            <p><strong>Arrival:</strong> ${new Date(flight.arrivalTime).toLocaleString()}</p>
            <p><strong>Passenger:</strong> ${booking.passengerFirstName} ${booking.passengerLastName}</p>
          </div>
          
          <p>You can view your booking details and status anytime by logging into your SkyBooker account.</p>
          
          <p>Safe travels!</p>
          <p>The SkyBooker Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent: ${info.messageId}`);
    
    // Only log preview URL for test accounts (Ethereal)
    if (!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) && nodemailer.getTestMessageUrl(info)) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
}

// Function to send booking status update email
export async function sendBookingStatusUpdateEmail(booking: BookingWithDetails, previousStatus: string) {
  if (!transporter) {
    await initializeEmailService();
  }
  
  try {
    const { flight } = booking;
    
    const mailOptions = {
      from: '"SkyBooker" <updates@skybooker.com>',
      to: booking.passengerEmail,
      subject: `Booking Status Update - Flight ${flight.origin.code} to ${flight.destination.code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Booking Status Update</h2>
          <p>Dear ${booking.passengerFirstName} ${booking.passengerLastName},</p>
          <p>We're writing to inform you that the status of your booking has been updated.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a;">Booking Details</h3>
            <p><strong>Booking Reference:</strong> ${booking.id}</p>
            <p><strong>Previous Status:</strong> ${previousStatus}</p>
            <p><strong>New Status:</strong> ${booking.status}</p>
            <p><strong>Flight:</strong> From ${flight.origin.city} (${flight.origin.code}) to ${flight.destination.city} (${flight.destination.code})</p>
            <p><strong>Departure:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
          </div>
          
          ${getStatusSpecificMessage(booking.status)}
          
          <p>You can view your booking details and status anytime by logging into your SkyBooker account.</p>
          
          <p>Thank you for choosing SkyBooker for your travel needs.</p>
          <p>Best regards,</p>
          <p>The SkyBooker Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Booking status update email sent: ${info.messageId}`);
    
    // Only log preview URL for test accounts (Ethereal)
    if (!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) && nodemailer.getTestMessageUrl(info)) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending booking status update email:', error);
    throw error;
  }
}

// Function to send payment confirmation email
export async function sendPaymentConfirmationEmail(booking: BookingWithDetails) {
  if (!transporter) {
    await initializeEmailService();
  }
  
  try {
    const { flight } = booking;
    
    // Generate PDF receipt
    const pdfPath = await generateReceiptPdf(booking);
    const absolutePdfPath = path.join(process.cwd(), pdfPath.replace(/^\//, ''));
    
    // Save receipt path to booking if needed
    if (!booking.receiptPath) {
      // This could be saved to the database, but we'll keep it simple for now
      console.log(`Generated receipt PDF: ${pdfPath}`);
    }
    
    const mailOptions = {
      from: '"SkyBooker Payments" <payments@skybooker.com>',
      to: booking.passengerEmail,
      subject: `Payment Confirmed - Flight ${flight.origin.code} to ${flight.destination.code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Payment Confirmed</h2>
          <p>Dear ${booking.passengerFirstName} ${booking.passengerLastName},</p>
          <p>We're pleased to confirm that we've received your payment for the following booking:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a;">Payment Details</h3>
            <p><strong>Booking Reference:</strong> ${booking.id}</p>
            <p><strong>Payment Reference:</strong> ${booking.paymentReference || 'N/A'}</p>
            <p><strong>Amount:</strong> $${flight.price.toFixed(2)}</p>
            <p><strong>Flight:</strong> From ${flight.origin.city} (${flight.origin.code}) to ${flight.destination.city} (${flight.destination.code})</p>
            <p><strong>Departure:</strong> ${new Date(flight.departureTime).toLocaleString()}</p>
          </div>
          
          <p>Your booking is now confirmed and ready for travel.</p>
          <p>We've attached a PDF receipt to this email for your records. You can also download it anytime from your account dashboard.</p>
          <p>Thank you for choosing SkyBooker for your travel needs.</p>
          
          <p>Best regards,</p>
          <p>The SkyBooker Payments Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `SkyBooker_Receipt_${booking.id}.pdf`,
          path: absolutePdfPath,
          contentType: 'application/pdf'
        }
      ]
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Payment confirmation email with receipt sent: ${info.messageId}`);
    
    // Only log preview URL for test accounts (Ethereal)
    if (!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) && nodemailer.getTestMessageUrl(info)) {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    throw error;
  }
}

// Helper function to get status-specific messages
function getStatusSpecificMessage(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return `
        <p>Your booking is now confirmed. Please make sure to arrive at the airport at least 2 hours before your scheduled departure time.</p>
      `;
    case 'pending payment':
      return `
        <p>Your booking is pending payment. Please complete your payment to confirm your booking.</p>
        <p>You can make a payment by logging into your account and going to the My Bookings section.</p>
      `;
    case 'paid':
      return `
        <p>We have received your payment. Your booking is now fully paid and confirmed.</p>
        <p>Please make sure to arrive at the airport at least 2 hours before your scheduled departure time.</p>
      `;
    case 'cancelled':
      return `
        <p>Your booking has been cancelled. If you believe this is an error, please contact our customer support team.</p>
      `;
    case 'completed':
      return `
        <p>Your flight has been completed. We hope you had a pleasant journey!</p>
        <p>Please consider leaving a review of your experience.</p>
      `;
    case 'declined':
      return `
        <p>We regret to inform you that your booking payment has been declined.</p>
        <p>Please contact our customer support team for more information or try to make a payment again.</p>
      `;
    default:
      return '';
  }
}