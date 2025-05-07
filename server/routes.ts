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

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

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

      const updatedBooking = await storage.updateBookingPayment(bookingId, {
        paymentReference,
        paymentProof
      });

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
      if (!status || !["Pending", "Confirmed", "Declined", "Completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const booking = await storage.updateBookingStatus(bookingId, status);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(booking);
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
