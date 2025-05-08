import { type Express } from "express";
import express from 'express';
import { createServer, type Server } from "http";
import { setupAuth, isAdmin, hashPassword } from "./auth";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { randomBytes } from "crypto";
import rateLimit from 'express-rate-limit';
import { 
  insertFlightSchema, 
  insertLocationSchema, 
  insertBookingSchema, 
  insertPaymentAccountSchema,
  insertUserSchema,
  insertSiteSettingSchema,
  insertPageContentSchema,
  flightSearchSchema
} from "@shared/schema";

// Rate limiter for general API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for sensitive operations
export const sensitiveApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many sensitive operations from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

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
  
  // Apply rate limiting to all API routes
  app.use("/api/", apiLimiter);

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

  // Create booking (requires auth) - sensitive operation with stricter rate limiting
  app.post("/api/bookings", sensitiveApiLimiter, async (req, res) => {
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

  // Upload payment proof for booking - sensitive operation with stricter rate limiting
  app.post("/api/bookings/:id/payment", sensitiveApiLimiter, upload.single("paymentProof"), async (req, res) => {
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

      // Auto-generate payment reference if not provided
      let paymentReference = req.body.paymentReference;
      if (!paymentReference) {
        // Generate a unique reference with format: TX-[6 random alphanumeric chars]-[timestamp]
        const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
        const timestamp = Date.now();
        paymentReference = `TX-${randomChars}-${timestamp}`;
      }
      
      const paymentProof = req.file ? `/uploads/${req.file.filename}` : undefined;

      // Payment proof is still required
      if (!paymentProof) {
        return res.status(400).json({ message: "Payment proof is required" });
      }

      console.log(`Processing payment for booking ${bookingId} with reference ${paymentReference}`);
      
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
      console.log("Fetching payment accounts...");
      const accounts = await storage.getPaymentAccounts();
      console.log("Payment accounts fetched:", accounts);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching payment accounts:", error);
      res.status(500).json({ message: "Failed to fetch payment accounts" });
    }
  });
  
  // Generate receipt for booking - sensitive operation with stricter rate limiting
  app.post("/api/bookings/:id/receipt", sensitiveApiLimiter, async (req, res) => {
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
      console.log("Creating flight with data:", req.body);
      
      // Validate that originId and destinationId are different
      if (req.body.originId === req.body.destinationId) {
        return res.status(400).json({ 
          message: "Origin and destination cannot be the same location" 
        });
      }

      // Do basic validation on dates
      try {
        const departureTime = new Date(req.body.departureTime);
        const arrivalTime = new Date(req.body.arrivalTime);
        
        if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
          return res.status(400).json({ 
            message: "Invalid date format for departure or arrival time" 
          });
        }
        
        if (departureTime >= arrivalTime) {
          return res.status(400).json({ 
            message: "Departure time must be before arrival time" 
          });
        }
      } catch (dateErr) {
        console.error("Date validation error:", dateErr);
        return res.status(400).json({ 
          message: "Invalid date format for departure or arrival time" 
        });
      }

      // Convert string dates to Date objects for the database
      const flightData = {
        ...req.body,
        departureTime: new Date(req.body.departureTime),
        arrivalTime: new Date(req.body.arrivalTime)
      };
      
      console.log("Transformed flight data:", flightData);

      // Validate the data with our schema
      const parseResult = insertFlightSchema.safeParse(flightData);
      if (!parseResult.success) {
        console.error("Flight schema validation failed:", parseResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid flight data", 
          errors: parseResult.error.errors 
        });
      }

      const flight = await storage.createFlight(flightData);
      res.status(201).json(flight);
    } catch (error) {
      console.error("Error creating flight:", error);
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

      console.log("Updating flight:", flightId, "with data:", req.body);
      
      // Validate that originId and destinationId are different
      if (req.body.originId === req.body.destinationId) {
        return res.status(400).json({ 
          message: "Origin and destination cannot be the same location" 
        });
      }

      // Do basic validation on dates
      try {
        const departureTime = new Date(req.body.departureTime);
        const arrivalTime = new Date(req.body.arrivalTime);
        
        if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
          return res.status(400).json({ 
            message: "Invalid date format for departure or arrival time" 
          });
        }
        
        if (departureTime >= arrivalTime) {
          return res.status(400).json({ 
            message: "Departure time must be before arrival time" 
          });
        }
      } catch (dateErr) {
        console.error("Date validation error:", dateErr);
        return res.status(400).json({ 
          message: "Invalid date format for departure or arrival time" 
        });
      }

      // Convert date strings to Date objects manually before validation
      const flightData = {
        ...req.body,
        departureTime: new Date(req.body.departureTime),
        arrivalTime: new Date(req.body.arrivalTime)
      };
      
      console.log("Transformed flight data:", flightData);
      
      // Validate the data with our schema
      const parseResult = insertFlightSchema.safeParse(flightData);
      if (!parseResult.success) {
        console.error("Flight schema validation failed:", parseResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid flight data", 
          errors: parseResult.error.errors 
        });
      }

      const flight = await storage.updateFlight(flightId, flightData);
      if (!flight) {
        return res.status(404).json({ message: "Flight not found" });
      }

      res.json(flight);
    } catch (error) {
      console.error("Error updating flight:", error);
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
      console.log("Admin requesting all bookings");
      const bookings = await storage.getAllBookings();
      console.log("Found bookings:", bookings);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update booking status (admin only) - sensitive operation with stricter rate limiting
  app.put("/api/admin/bookings/:id/status", sensitiveApiLimiter, isAdmin, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const { status, declineReason } = req.body;
      if (!status || !["Pending", "Confirmed", "Paid", "Declined", "Completed", "Pending Payment"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get the current booking to check previous status
      const currentBooking = await storage.getBookingById(bookingId);
      if (!currentBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      const previousStatus = currentBooking.status;
      
      // Update the status (with optional decline reason if status is Declined)
      const updatedBooking = await storage.updateBookingStatus(bookingId, status, status === "Declined" ? declineReason : undefined);
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
  
  // Create user (admin only)
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      // Validate input
      const userInput = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userInput.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Check if email already exists if email is provided
      if (userInput.email) {
        const userWithEmail = await storage.getUserByEmail(userInput.email);
        if (userWithEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      
      // Hash password
      userInput.password = await hashPassword(userInput.password);
      
      // Create user
      const newUser = await storage.createUser(userInput);
      res.status(201).json(newUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Update user (admin only)
  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Validate input
      const userInput = req.body;
      
      // Check username uniqueness if changing username
      if (userInput.username && userInput.username !== existingUser.username) {
        const userWithUsername = await storage.getUserByUsername(userInput.username);
        if (userWithUsername) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
      
      // Check email uniqueness if changing email
      if (userInput.email && userInput.email !== existingUser.email) {
        const userWithEmail = await storage.getUserByEmail(userInput.email);
        if (userWithEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      
      // Hash password if provided
      if (userInput.password) {
        userInput.password = await hashPassword(userInput.password);
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, userInput);
      res.json(updatedUser);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete user (admin only)
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting self
      if (req.user?.id === userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Delete user
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update payment accounts (admin only) - sensitive operation with stricter rate limiting
  app.post("/api/admin/payment-accounts", sensitiveApiLimiter, isAdmin, async (req, res) => {
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

  // ==== SITE SETTINGS ROUTES ====

  // Get all site settings (public)
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // Get site setting by key (public)
  app.get("/api/site-settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSiteSettingByKey(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site setting" });
    }
  });

  // Update or create site setting (admin only)
  app.post("/api/admin/site-settings", isAdmin, async (req, res) => {
    try {
      const parseResult = insertSiteSettingSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid site setting data", errors: parseResult.error.errors });
      }

      const setting = await storage.upsertSiteSetting(parseResult.data);
      res.status(201).json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update site setting" });
    }
  });

  // Delete site setting (admin only)
  app.delete("/api/admin/site-settings/:key", isAdmin, async (req, res) => {
    try {
      const key = req.params.key;
      const success = await storage.deleteSiteSetting(key);
      
      if (!success) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete site setting" });
    }
  });

  // Logo upload endpoint (admin only)
  app.post("/api/admin/site-settings/logo", isAdmin, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Logo file is required" });
      }
      
      const logoPath = `/uploads/${req.file.filename}`;
      
      // Save the logo path as a site setting
      const setting = await storage.upsertSiteSetting({
        key: "logo",
        value: logoPath
      });
      
      res.status(201).json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });
  
  // ===== PAGE CONTENT ROUTES =====
  
  // Get all page contents (public)
  app.get("/api/page-contents", async (req, res) => {
    try {
      const contents = await storage.getAllPageContents();
      res.json(contents);
    } catch (error) {
      console.error("Error fetching page contents:", error);
      res.status(500).json({ message: "Failed to fetch page contents" });
    }
  });
  
  // Get page content by slug (public)
  app.get("/api/page-contents/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const content = await storage.getPageContentBySlug(slug);
      
      if (!content) {
        return res.status(404).json({ message: "Page content not found" });
      }
      
      res.json(content);
    } catch (error) {
      console.error(`Error fetching page content with slug ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch page content" });
    }
  });
  
  // Create page content (admin only)
  app.post("/api/admin/page-contents", isAdmin, async (req, res) => {
    try {
      // isAdmin middleware ensures req.user exists
      const parseResult = insertPageContentSchema.safeParse({
        ...req.body,
        updatedBy: req.user!.id
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid page content data", 
          errors: parseResult.error.errors 
        });
      }
      
      // Check if a page with this slug already exists
      const existingContent = await storage.getPageContentBySlug(parseResult.data.slug);
      if (existingContent) {
        return res.status(400).json({ message: "A page with this slug already exists" });
      }
      
      const newContent = await storage.createPageContent(parseResult.data);
      res.status(201).json(newContent);
    } catch (error) {
      console.error("Error creating page content:", error);
      res.status(500).json({ message: "Failed to create page content" });
    }
  });
  
  // Update page content (admin only)
  app.put("/api/admin/page-contents/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const contentData = {
        ...req.body,
        updatedBy: req.user!.id,
        updatedAt: new Date()
      };
      
      // Check if changing slug to one that already exists
      if (contentData.slug) {
        const existingContent = await storage.getPageContentBySlug(contentData.slug);
        if (existingContent && existingContent.id !== parseInt(id)) {
          return res.status(400).json({ message: "A page with this slug already exists" });
        }
      }
      
      const updatedContent = await storage.updatePageContent(parseInt(id), contentData);
      
      if (!updatedContent) {
        return res.status(404).json({ message: "Page content not found" });
      }
      
      res.json(updatedContent);
    } catch (error) {
      console.error(`Error updating page content with id ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update page content" });
    }
  });
  
  // Delete page content (admin only)
  app.delete("/api/admin/page-contents/:id", isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePageContent(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ message: "Page content not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error(`Error deleting page content with id ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to delete page content" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
