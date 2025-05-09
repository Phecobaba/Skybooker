import { users, locations, flights, bookings, paymentAccounts, siteSettings, pageContents } from "@shared/schema";
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
  BookingWithDetails,
  SiteSetting,
  InsertSiteSetting,
  PageContent,
  InsertPageContent
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

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // First check if user has any bookings
      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.userId, id));
        
      if (userBookings.length > 0) {
        throw new Error("Cannot delete user with associated bookings");
      }
      
      // If no bookings, proceed with deletion
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ deletedId: users.id });
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof Error) {
        throw error; // Re-throw custom errors
      }
      return false;
    }
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
    try {
      console.log(`Enhancing flight ${flight.id} with location details`);
      
      // Get origin location
      const [origin] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, flight.originId));
      
      if (!origin) {
        console.error(`Could not find origin location with ID ${flight.originId} for flight ${flight.id}`);
        throw new Error(`Origin location not found for flight ${flight.id}`);
      }
      
      // Get destination location
      const [destination] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, flight.destinationId));
      
      if (!destination) {
        console.error(`Could not find destination location with ID ${flight.destinationId} for flight ${flight.id}`);
        throw new Error(`Destination location not found for flight ${flight.id}`);
      }
      
      // Return enhanced flight with locations
      return {
        ...flight,
        origin,
        destination
      };
    } catch (error) {
      console.error(`Error enhancing flight ${flight.id} with locations:`, error);
      throw error;
    }
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
    try {
      console.log(`Searching flights from ${originCode} to ${destinationCode} on ${date.toISOString()}`);
      
      // Find origin location by code
      const [origin] = await db
        .select()
        .from(locations)
        .where(eq(locations.code, originCode));
      
      if (!origin) {
        console.log(`Origin location with code ${originCode} not found`);
        return [];
      }
      
      // Find destination location by code
      const [destination] = await db
        .select()
        .from(locations)
        .where(eq(locations.code, destinationCode));
      
      if (!destination) {
        console.log(`Destination location with code ${destinationCode} not found`);
        return [];
      }
      
      console.log(`Found origin: ${origin.name} (${origin.code}), destination: ${destination.name} (${destination.code})`);
      
      // Convert date to start/end of day for search range
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`Searching for flights between ${startDate.toISOString()} and ${endDate.toISOString()}`);
      
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
      
      console.log(`Found ${matchingFlights.length} matching flights`);
      
      if (matchingFlights.length === 0) {
        return [];
      }
      
      // Enhance each flight with location data
      try {
        const enhancedFlights = await Promise.all(
          matchingFlights.map(flight => this.enhanceFlightWithLocations(flight))
        );
        
        console.log(`Successfully enhanced ${enhancedFlights.length} flights with location data`);
        return enhancedFlights;
      } catch (enhanceError) {
        console.error("Error enhancing flight locations:", enhanceError);
        throw enhanceError;
      }
    } catch (error) {
      console.error("Error in searchFlights:", error);
      throw error;
    }
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
    try {
      console.log(`Enhancing booking details for booking ID: ${booking.id}`);
      
      // Get the user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, booking.userId));
      
      if (!user) {
        console.error(`Could not find user with ID ${booking.userId} for booking ${booking.id}`);
        throw new Error(`User not found for booking ${booking.id}`);
      }
      
      // Get the flight
      const flight = await this.getFlight(booking.flightId);
      if (!flight) {
        console.error(`Could not find flight with ID ${booking.flightId} for booking ${booking.id}`);
        throw new Error(`Flight not found for booking ${booking.id}`);
      }
      
      // Enhance flight with location details
      try {
        const flightWithLocations = await this.enhanceFlightWithLocations(flight);
        
        return {
          ...booking,
          user,
          flight: flightWithLocations
        };
      } catch (flightErr) {
        console.error(`Error enhancing flight for booking ${booking.id}:`, flightErr);
        throw new Error(`Error enhancing flight data for booking ${booking.id}`);
      }
    } catch (error) {
      console.error(`Failed to enhance booking ${booking.id} with details:`, error);
      throw error;
    }
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

  async updateBookingStatus(id: number, status: string, declineReason?: string): Promise<Booking | undefined> {
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
    
    // Prepare the update data
    const updateData: Partial<Booking> = { status };
    
    // Add decline reason if provided and status is "Declined"
    if (status === "Declined" && declineReason) {
      updateData.declineReason = declineReason;
    }
    
    const [booking] = await db
      .update(bookings)
      .set(updateData)
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

  async updateBookingPayment(id: number, payment: { paymentReference?: string, paymentProof?: string, receiptPath?: string }): Promise<Booking | undefined> {
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
  
  async updateBookingReceipt(id: number, receiptPath: string): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ receiptPath })
      .where(eq(bookings.id, id))
      .returning();
    
    return booking || undefined;
  }
  
  async deleteBooking(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(bookings)
        .where(eq(bookings.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting booking:", error);
      throw error;
    }
  }
  
  async deleteManyBookings(ids: number[]): Promise<number> {
    try {
      if (ids.length === 0) {
        return 0;
      }
      
      const result = await db
        .delete(bookings)
        .where(inArray(bookings.id, ids));
      
      return result.rowCount;
    } catch (error) {
      console.error("Error deleting multiple bookings:", error);
      throw error;
    }
  }

  // Payment Account methods
  async getPaymentAccounts(): Promise<PaymentAccount[]> {
    try {
      // Get all accounts and sort by ID (newest first)
      const accounts = await db.select().from(paymentAccounts);
      
      // Ensure all accounts have the tax and service fee rates
      const processedAccounts = accounts.map(account => {
        return {
          ...account,
          // Default to 13% tax rate if not set
          taxRate: account.taxRate !== null && account.taxRate !== undefined ? account.taxRate : 0.13,
          // Default to 4% service fee if not set
          serviceFeeRate: account.serviceFeeRate !== null && account.serviceFeeRate !== undefined ? account.serviceFeeRate : 0.04
        };
      });
      
      return processedAccounts.sort((a, b) => b.id - a.id);
    } catch (error) {
      console.error("Database error in getPaymentAccounts:", error);
      throw error;
    }
  }

  async updatePaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount> {
    try {
      // Format the account data with defaults for new fields if not provided
      const accountData = {
        ...account,
        taxRate: account.taxRate !== undefined ? account.taxRate : 0.13,
        serviceFeeRate: account.serviceFeeRate !== undefined ? account.serviceFeeRate : 0.04
      };
      
      // Since the interface expects account to have an id, we need to check it
      const accountId = (account as any).id;
      
      if (accountId) {
        // Update existing account
        const [updatedAccount] = await db
          .update(paymentAccounts)
          .set(accountData)
          .where(eq(paymentAccounts.id, accountId))
          .returning();
        
        return updatedAccount;
      } else {
        // Create new account
        const [newAccount] = await db
          .insert(paymentAccounts)
          .values(accountData)
          .returning();
        
        return newAccount;
      }
    } catch (error) {
      console.error("Error updating payment account:", error);
      throw error;
    }
  }

  // Site Settings methods
  async getSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings);
  }

  async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key));
    return setting || undefined;
  }

  async upsertSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    try {
      // Check if setting already exists
      const existingSetting = await this.getSiteSettingByKey(setting.key);
      
      if (existingSetting) {
        // Update existing setting
        const [updatedSetting] = await db
          .update(siteSettings)
          .set({
            value: setting.value,
            updatedAt: new Date()
          })
          .where(eq(siteSettings.key, setting.key))
          .returning();
        
        return updatedSetting;
      } else {
        // Create new setting
        const [newSetting] = await db
          .insert(siteSettings)
          .values({
            ...setting,
            updatedAt: new Date()
          })
          .returning();
        
        return newSetting;
      }
    } catch (error) {
      console.error("Error upserting site setting:", error);
      throw error;
    }
  }

  async deleteSiteSetting(key: string): Promise<boolean> {
    try {
      const result = await db
        .delete(siteSettings)
        .where(eq(siteSettings.key, key))
        .returning({ deletedKey: siteSettings.key });
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting site setting:", error);
      return false;
    }
  }

  // Page Content methods
  async getAllPageContents(): Promise<PageContent[]> {
    try {
      return await db.select().from(pageContents);
    } catch (error) {
      console.error("Error fetching page contents:", error);
      return [];
    }
  }

  async getPageContentBySlug(slug: string): Promise<PageContent | undefined> {
    try {
      const [content] = await db
        .select()
        .from(pageContents)
        .where(eq(pageContents.slug, slug));
      return content || undefined;
    } catch (error) {
      console.error(`Error fetching page content with slug ${slug}:`, error);
      return undefined;
    }
  }

  async createPageContent(content: InsertPageContent): Promise<PageContent> {
    try {
      const [newContent] = await db
        .insert(pageContents)
        .values({
          ...content,
          updatedAt: new Date()
        })
        .returning();
      return newContent;
    } catch (error) {
      console.error("Error creating page content:", error);
      throw error;
    }
  }

  async updatePageContent(id: number, content: Partial<InsertPageContent>): Promise<PageContent | undefined> {
    try {
      const [updatedContent] = await db
        .update(pageContents)
        .set({
          ...content,
          updatedAt: new Date()
        })
        .where(eq(pageContents.id, id))
        .returning();
      return updatedContent || undefined;
    } catch (error) {
      console.error(`Error updating page content with id ${id}:`, error);
      return undefined;
    }
  }

  async deletePageContent(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(pageContents)
        .where(eq(pageContents.id, id))
        .returning({ deletedId: pageContents.id });
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting page content with id ${id}:`, error);
      return false;
    }
  }
}