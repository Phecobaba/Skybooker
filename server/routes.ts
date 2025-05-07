import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAdmin } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { randomBytes } from "crypto";
import { 
  insertFlightSchema, 
  insertLocationSchema, 
  insertBookingSchema, 
  insertPaymentAccountSchema,
  flightSearchSchema
} from "@shared/schema";

// Set up multer for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomBytes(6).toString("hex")}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image file.") as any);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Create uploads directory if it doesn't exist
  const fs = await import("fs");
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Create receipts directory if it doesn't exist
  const receiptsDir = path.join(process.cwd(), "uploads", "receipts");
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));
  
  // Import PDF service
  const { generateReceiptPdf } = await import("./pdf-service");
  // Initialize email service
  const { initializeEmailService, sendPaymentConfirmationEmail } = await import("./email-service");
  initializeEmailService().catch(error => console.error("Failed to initialize email service:", error));

  // ===== USER ROUTES =====

  // Get all locations
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Search flights
  app.get("/api/flights/search", async (req, res) => {
    try {
      const parseResult = flightSearchSchema.safeParse(req.query);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid search parameters", errors: parseResult.error.errors });
      }

      const params = parseResult.data;
      const flights = await storage.searchFlights(
        params.origin,
        params.destination,
        new Date(params.departureDate)
      );
      
      res.json(flights);
    } catch (error) {
      res.status(500).json({ message: "Failed to search flights" });
    }
  });

  // Get flight by ID
  app.get("/api/flights/:id", async (req, res) => {
    try {
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: "Invalid flight ID" });
      }

      const flight = await storage.getFlightWithLocations(flightId);
      if (!flight) {
        return res.status(404).json({ message: "Flight not found" });
      }

      res.json(flight);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flight" });
    }
  });

  // Create booking (requires auth)
  app.post("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to book a flight" });
    }

    try {
      const parseResult = insertBookingSchema.safeParse({
        ...req.body,
        userId: req.user.id
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid booking data", errors: parseResult.error.errors });
      }

      const booking = await storage.createBooking(parseResult.data);
      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Get user's bookings (requires auth)
  app.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view bookings" });
    }

    try {
      const bookings = await storage.getBookingsByUserId(req.user.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get booking by ID (requires auth)
  app.get("/api/bookings/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view bookings" });
    }

    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Users can only view their own bookings (admin can see all)
      if (booking.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to view this booking" });
      }

      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Upload payment proof for booking
  app.post("/api/bookings/:id/payment", upload.single("paymentProof"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to update payment" });
    }

    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Users can only update their own bookings
      if (booking.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this booking" });
      }

      const paymentReference = req.body.paymentReference;
      const paymentProof = req.file ? `/uploads/${req.file.filename}` : undefined;

      if (!paymentProof && !paymentReference) {
        return res.status(400).json({ message: "Payment proof or reference is required" });
      }

      // Update booking with payment info
      const updatedBooking = await storage.updateBookingPayment(bookingId, {
        paymentReference,
        paymentProof
      });
      
      // If the status is already set to "Paid", generate receipt
      if (updatedBooking && updatedBooking.status.toLowerCase() === "paid") {
        try {
          // Get full booking details with relations
          const fullBooking = await storage.getBookingById(bookingId);
          if (fullBooking) {
            // Generate receipt if it doesn't exist
            if (!fullBooking.receiptPath) {
              const receiptPath = await generateReceiptPdf(fullBooking);
              await storage.updateBookingReceipt(bookingId, receiptPath);
              // Update our local reference too
              if (updatedBooking) {
                updatedBooking.receiptPath = receiptPath;
              }
            }
          }
        } catch (genError) {
          console.error("Error generating receipt:", genError);
          // We'll still return success for the payment update, but log the receipt generation error
        }
      }

      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  // Get payment accounts
  app.get("/api/payment-accounts", async (req, res) => {
    try {
      const accounts = await storage.getPaymentAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment accounts" });
    }
  });
  
  // Generate receipt for booking
  app.post("/api/bookings/:id/receipt", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to generate a receipt" });
    }

    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Users can only generate receipts for their own bookings (admin can generate all)
      if (booking.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to access this booking" });
      }
      
      // Only generate receipt for paid bookings
      if (booking.status.toLowerCase() !== 'paid' && booking.status.toLowerCase() !== 'completed') {
        return res.status(400).json({ message: "Receipt can only be generated for paid bookings" });
      }

      // Generate PDF receipt
      const receiptPath = await generateReceiptPdf(booking);
      
      // Store receipt path in database
      await storage.updateBookingReceipt(bookingId, receiptPath);
      
      // Return the path to download the receipt
      res.json({ receiptPath });
    } catch (error) {
      console.error("Error generating receipt:", error);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });
  
  // Download receipt for booking
  app.get("/api/bookings/:id/receipt", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to download a receipt" });
    }

    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Users can only download receipts for their own bookings (admin can download all)
      if (booking.userId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ message: "You don't have permission to access this booking" });
      }
      
      // Check if receipt exists
      if (!booking.receiptPath) {
        // Generate one if it doesn't exist
        const receiptPath = await generateReceiptPdf(booking);
        await storage.updateBookingReceipt(bookingId, receiptPath);
        booking.receiptPath = receiptPath;
      }
      
      // Send the receipt file
      const filePath = path.join(process.cwd(), booking.receiptPath.replace(/^\//, ''));
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Receipt file not found" });
      }
      
      res.download(filePath, `SkyBooker_Receipt_${booking.id}.pdf`);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      res.status(500).json({ message: "Failed to download receipt" });
    }
  });

  // ===== ADMIN ROUTES =====

  // Create location (admin only)
  app.post("/api/admin/locations", isAdmin, async (req, res) => {
    try {
      const parseResult = insertLocationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid location data", errors: parseResult.error.errors });
      }

      const location = await storage.createLocation(parseResult.data);
      res.status(201).json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Update location (admin only)
  app.put("/api/admin/locations/:id", isAdmin, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const parseResult = insertLocationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid location data", errors: parseResult.error.errors });
      }

      const location = await storage.updateLocation(locationId, parseResult.data);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Delete location (admin only)
  app.delete("/api/admin/locations/:id", isAdmin, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const deleted = await storage.deleteLocation(locationId);
      if (!deleted) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Create flight (admin only)
  app.post("/api/admin/flights", isAdmin, async (req, res) => {
    try {
      const parseResult = insertFlightSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid flight data", errors: parseResult.error.errors });
      }

      const flight = await storage.createFlight(parseResult.data);
      res.status(201).json(flight);
    } catch (error) {
      res.status(500).json({ message: "Failed to create flight" });
    }
  });

  // Update flight (admin only)
  app.put("/api/admin/flights/:id", isAdmin, async (req, res) => {
    try {
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: "Invalid flight ID" });
      }

      const parseResult = insertFlightSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid flight data", errors: parseResult.error.errors });
      }

      const flight = await storage.updateFlight(flightId, parseResult.data);
      if (!flight) {
        return res.status(404).json({ message: "Flight not found" });
      }

      res.json(flight);
    } catch (error) {
      res.status(500).json({ message: "Failed to update flight" });
    }
  });

  // Delete flight (admin only)
  app.delete("/api/admin/flights/:id", isAdmin, async (req, res) => {
    try {
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: "Invalid flight ID" });
      }

      const deleted = await storage.deleteFlight(flightId);
      if (!deleted) {
        return res.status(404).json({ message: "Flight not found" });
      }

      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete flight" });
    }
  });

  // Get all flights (admin only)
  app.get("/api/admin/flights", isAdmin, async (req, res) => {
    try {
      const flights = await storage.getAllFlights();
      res.json(flights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flights" });
    }
  });

  // Get all bookings (admin only)
  app.get("/api/admin/bookings", isAdmin, async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update booking status (admin only)
  app.put("/api/admin/bookings/:id/status", isAdmin, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const { status } = req.body;
      if (!status || !["Pending", "Confirmed", "Paid", "Declined", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get the current booking to check previous status
      const currentBooking = await storage.getBookingById(bookingId);
      if (!currentBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const previousStatus = currentBooking.status;
      
      // Update the status
      const updatedBooking = await storage.updateBookingStatus(bookingId, status);
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // If status changed to "Paid", generate receipt automatically
      if (status === "Paid" && previousStatus !== "Paid") {
        try {
          // Get full booking details again after status update
          const fullBooking = await storage.getBookingById(bookingId);
          if (fullBooking) {
            // Generate receipt
            const receiptPath = await generateReceiptPdf(fullBooking);
            
            // Update booking with receipt path
            await storage.updateBookingReceipt(bookingId, receiptPath);
            
            // Send payment confirmation email with receipt
            sendPaymentConfirmationEmail(fullBooking).catch(err => 
              console.error("Failed to send payment confirmation email:", err)
            );
          }
        } catch (genError) {
          console.error("Error generating receipt:", genError);
          // We'll still return success for the status update, but log the receipt generation error
        }
      }

      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update payment accounts (admin only)
  app.post("/api/admin/payment-accounts", isAdmin, async (req, res) => {
    try {
      const parseResult = insertPaymentAccountSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid payment account data", errors: parseResult.error.errors });
      }

      const account = await storage.updatePaymentAccount(parseResult.data);
      res.status(201).json(account);
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment accounts" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

import express from "express";
