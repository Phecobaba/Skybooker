import { users, locations, flights, bookings, paymentAccounts } from "@shared/schema";
import type { 
  User, 
  InsertUser, 
  Location, 
  InsertLocation, 
  Flight, 
  InsertFlight, 
  Booking, 
  InsertBooking, 
  PaymentAccount, 
  InsertPaymentAccount,
  FlightWithLocations,
  BookingWithDetails
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import { IStorage } from "./storage";
import { 
  sendBookingConfirmationEmail, 
  sendBookingStatusUpdateEmail, 
  sendPaymentConfirmationEmail, 
  initializeEmailService 
} from "./email-service";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any for session store type

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
    
    // Initialize the email service when storage is created
    initializeEmailService().catch(err => {
      console.error("Failed to initialize email service:", err);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id));
    return location || undefined;
  }

  async getLocationByCode(code: string): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.code, code));
    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(insertLocation)
      .returning();
    return location;
  }

  async updateLocation(id: number, insertLocation: InsertLocation): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set(insertLocation)
      .where(eq(locations.id, id))
      .returning();
    return location || undefined;
  }

  async deleteLocation(id: number): Promise<boolean> {
    // Check if there are flights using this location
    const flightsWithLocation = await db
      .select()
      .from(flights)
      .where(
        and(
          eq(flights.originId, id),
          eq(flights.destinationId, id)
        )
      );
    
    if (flightsWithLocation.length > 0) {
      throw new Error("Cannot delete location with associated flights");
    }
    
    const [deletedLocation] = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning();
    
    return !!deletedLocation;
  }

  // Flight methods
  async getAllFlights(): Promise<FlightWithLocations[]> {
    const allFlights = await db.select().from(flights);
    return await Promise.all(allFlights.map(flight => this.enhanceFlightWithLocations(flight)));
  }

  async getFlight(id: number): Promise<Flight | undefined> {
    const [flight] = await db
      .select()
      .from(flights)
      .where(eq(flights.id, id));
    return flight || undefined;
  }

  async getFlightWithLocations(id: number): Promise<FlightWithLocations | undefined> {
    const flight = await this.getFlight(id);
    if (!flight) {
      return undefined;
    }
    
    return this.enhanceFlightWithLocations(flight);
  }

  private async enhanceFlightWithLocations(flight: Flight): Promise<FlightWithLocations> {
    const [origin] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, flight.originId));
    
    const [destination] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, flight.destinationId));
    
    if (!origin || !destination) {
      throw new Error(`Could not find origin or destination for flight ${flight.id}`);
    }
    
    return {
      ...flight,
      origin,
      destination
    };
  }

  async createFlight(insertFlight: InsertFlight): Promise<Flight> {
    const [flight] = await db
      .insert(flights)
      .values(insertFlight)
      .returning();
    return flight;
  }

  async updateFlight(id: number, insertFlight: InsertFlight): Promise<Flight | undefined> {
    const [flight] = await db
      .update(flights)
      .set(insertFlight)
      .where(eq(flights.id, id))
      .returning();
    return flight || undefined;
  }

  async deleteFlight(id: number): Promise<boolean> {
    // Check if there are bookings for this flight
    const bookingsForFlight = await db
      .select()
      .from(bookings)
      .where(eq(bookings.flightId, id));
    
    if (bookingsForFlight.length > 0) {
      throw new Error("Cannot delete flight with associated bookings");
    }
    
    const [deletedFlight] = await db
      .delete(flights)
      .where(eq(flights.id, id))
      .returning();
    
    return !!deletedFlight;
  }

  async searchFlights(originCode: string, destinationCode: string, date: Date): Promise<FlightWithLocations[]> {
    // Find location IDs by code
    const [origin] = await db
      .select()
      .from(locations)
      .where(eq(locations.code, originCode));
    
    const [destination] = await db
      .select()
      .from(locations)
      .where(eq(locations.code, destinationCode));
    
    if (!origin || !destination) {
      return [];
    }
    
    // Convert date to start/end of day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Find flights matching criteria
    const matchingFlights = await db
      .select()
      .from(flights)
      .where(
        and(
          eq(flights.originId, origin.id),
          eq(flights.destinationId, destination.id),
          gte(flights.departureTime, startDate),
          lte(flights.departureTime, endDate)
        )
      );
    
    // Enhance with location data
    return await Promise.all(matchingFlights.map(flight => this.enhanceFlightWithLocations(flight)));
  }

  // Booking methods
  async getAllBookings(): Promise<BookingWithDetails[]> {
    const allBookings = await db.select().from(bookings);
    return await Promise.all(
      allBookings.map(booking => this.enhanceBookingWithDetails(booking))
    );
  }

  async getBookingById(id: number): Promise<BookingWithDetails | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    
    if (!booking) {
      return undefined;
    }
    
    return this.enhanceBookingWithDetails(booking);
  }

  async getBookingsByUserId(userId: number): Promise<BookingWithDetails[]> {
    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId));
    
    return await Promise.all(
      userBookings.map(booking => this.enhanceBookingWithDetails(booking))
    );
  }

  private async enhanceBookingWithDetails(booking: Booking): Promise<BookingWithDetails> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, booking.userId));
    
    const flight = await this.getFlight(booking.flightId);
    
    if (!user || !flight) {
      throw new Error(`Could not find user or flight for booking ${booking.id}`);
    }
    
    const flightWithLocations = await this.enhanceFlightWithLocations(flight);
    
    return {
      ...booking,
      user,
      flight: flightWithLocations
    };
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const bookingWithDefaults = {
      ...insertBooking,
      bookingDate: new Date(),
      status: "Pending"
    };
    
    const [booking] = await db
      .insert(bookings)
      .values(bookingWithDefaults)
      .returning();
    
    try {
      // Get the complete booking with details to send in the email
      const bookingWithDetails = await this.enhanceBookingWithDetails(booking);
      // Send booking confirmation email
      await sendBookingConfirmationEmail(bookingWithDetails);
      console.log(`Booking confirmation email sent for booking ID: ${booking.id}`);
    } catch (error) {
      console.error(`Failed to send booking confirmation email for booking ID: ${booking.id}`, error);
      // We don't throw the error here because we still want to return the booking
      // even if the email fails to send
    }
    
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    // Get the booking before update to know the previous status
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    
    if (!existingBooking) {
      return undefined;
    }
    
    const previousStatus = existingBooking.status;
    
    // Only update if the status is actually changing
    if (previousStatus === status) {
      return existingBooking;
    }
    
    const [booking] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    
    if (!booking) {
      return undefined;
    }
    
    try {
      // Get the complete booking with details to send in the email
      const bookingWithDetails = await this.enhanceBookingWithDetails(booking);
      
      // Send booking status update email
      await sendBookingStatusUpdateEmail(bookingWithDetails, previousStatus);
      console.log(`Booking status update email sent for booking ID: ${booking.id} (${previousStatus} -> ${status})`);
      
      // If status changed to "Paid", also send a payment confirmation email
      if (status.toLowerCase() === "paid") {
        await sendPaymentConfirmationEmail(bookingWithDetails);
        console.log(`Payment confirmation email sent for booking ID: ${booking.id}`);
      }
    } catch (error) {
      console.error(`Failed to send booking status update email for booking ID: ${booking.id}`, error);
      // We don't throw the error here because we still want to return the booking
      // even if the email fails to send
    }
    
    return booking;
  }

  async updateBookingPayment(id: number, payment: { paymentReference?: string, paymentProof?: string }): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set(payment)
      .where(eq(bookings.id, id))
      .returning();
    
    if (!booking) {
      return undefined;
    }
    
    // If payment details are updated and booking status is still "Pending"
    // automatically update status to "Pending Payment"
    if (booking.status.toLowerCase() === "pending" && 
        (payment.paymentReference || payment.paymentProof)) {
      return this.updateBookingStatus(id, "Pending Payment");
    }
    
    return booking;
  }

  // Payment Account methods
  async getPaymentAccounts(): Promise<PaymentAccount[]> {
    return await db.select().from(paymentAccounts);
  }

  async updatePaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount> {
    // Since the interface expects account to have an id, we need to check it
    const accountId = (account as any).id;
    
    if (accountId) {
      // Update existing account
      const [updatedAccount] = await db
        .update(paymentAccounts)
        .set(account)
        .where(eq(paymentAccounts.id, accountId))
        .returning();
      
      return updatedAccount;
    } else {
      // Create new account
      const [newAccount] = await db
        .insert(paymentAccounts)
        .values(account)
        .returning();
      
      return newAccount;
    }
  }
}