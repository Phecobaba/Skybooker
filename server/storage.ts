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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Locations
  getAllLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  getLocationByCode(code: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: InsertLocation): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Flights
  getAllFlights(): Promise<FlightWithLocations[]>;
  getFlight(id: number): Promise<Flight | undefined>;
  getFlightWithLocations(id: number): Promise<FlightWithLocations | undefined>;
  createFlight(flight: InsertFlight): Promise<Flight>;
  updateFlight(id: number, flight: InsertFlight): Promise<Flight | undefined>;
  deleteFlight(id: number): Promise<boolean>;
  searchFlights(originCode: string, destinationCode: string, date: Date): Promise<FlightWithLocations[]>;

  // Bookings
  getAllBookings(): Promise<BookingWithDetails[]>;
  getBookingById(id: number): Promise<BookingWithDetails | undefined>;
  getBookingsByUserId(userId: number): Promise<BookingWithDetails[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string, declineReason?: string): Promise<Booking | undefined>;
  updateBookingPayment(id: number, payment: { paymentReference?: string, paymentProof?: string, receiptPath?: string }): Promise<Booking | undefined>;
  updateBookingReceipt(id: number, receiptPath: string): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  deleteManyBookings(ids: number[]): Promise<number>;

  // Payment Accounts
  getPaymentAccounts(): Promise<PaymentAccount[]>;
  updatePaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount>;

  // Site Settings
  getSiteSettings(): Promise<SiteSetting[]>;
  getSiteSettingByKey(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  deleteSiteSetting(key: string): Promise<boolean>;

  // Page Contents
  getAllPageContents(): Promise<PageContent[]>;
  getPageContentBySlug(slug: string): Promise<PageContent | undefined>;
  createPageContent(content: InsertPageContent): Promise<PageContent>;
  updatePageContent(id: number, content: Partial<InsertPageContent>): Promise<PageContent | undefined>;
  deletePageContent(id: number): Promise<boolean>;

  // Session store
  sessionStore: any; // Using any for session store type to avoid type errors
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private flights: Map<number, Flight>;
  private bookings: Map<number, Booking>;
  private paymentAccounts: Map<number, PaymentAccount>;
  private siteSettings: Map<number, SiteSetting>;
  private pageContents: Map<number, PageContent>;

  sessionStore: any; // Using any for session store type

  currentUserId: number;
  currentLocationId: number;
  currentFlightId: number;
  currentBookingId: number;
  currentPaymentAccountId: number;
  currentSiteSettingId: number;
  currentPageContentId: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.flights = new Map();
    this.bookings = new Map();
    this.paymentAccounts = new Map();
    this.siteSettings = new Map();
    this.pageContents = new Map();

    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentFlightId = 1;
    this.currentBookingId = 1;
    this.currentPaymentAccountId = 1;
    this.currentSiteSettingId = 1;
    this.currentPageContentId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Create an initial admin user
    this.users.set(1, {
      id: 1,
      username: "admin",
      password: "062e8e8231a59ae5c0fdcd189629cd59a47280aba629aa40fdd52a4512c899925941ce649711e9ba643dac262f3f207a0e474abb472592eb317face4db6f1fb9f225b9f919bbab5be564438ce274b3338fcfb2a5aba1e652a4852bc2f415b031cabd20fffdb8db0aba7617609101461fac0f9e4b0519dd76022ff6c9a528406c.45e9743e2836afb1581b9f9432771341b6bc4bddf878c6165ef88d77b05ee02f", // "adminpassword"
      firstName: "Admin",
      lastName: "User",
      email: "admin@skybooker.com",
      isAdmin: true
    });

    // Create default payment account
    this.paymentAccounts.set(1, {
      id: 1,
      bankName: "Global Trust Bank",
      accountName: "SkyBooker Flights Ltd",
      accountNumber: "8762-1095-3321-4000",
      swiftCode: "GTBIUS1234",
      bankInstructions: "Please include your booking reference in the payment description.",
      mobileProvider: "PayMobile",
      mobileNumber: "+1 (555) 987-6543",
      mobileInstructions: "Upload a screenshot of the payment confirmation.",
      bankEnabled: true,
      mobileEnabled: true,
      taxRate: 0.13,
      serviceFeeRate: 0.04
    });

    // Add sample locations
    const sampleLocations = [
      { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "USA" },
      { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "USA" },
      { code: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "USA" },
      { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "USA" },
      { code: "LHR", name: "Heathrow Airport", city: "London", country: "UK" },
      { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
      { code: "HND", name: "Haneda Airport", city: "Tokyo", country: "Japan" },
      { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE" },
      { code: "SYD", name: "Sydney Airport", city: "Sydney", country: "Australia" },
      { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" }
    ];

    sampleLocations.forEach(loc => {
      const id = this.currentLocationId++;
      this.locations.set(id, { id, ...loc });
    });

    // Create some sample flights
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(0, 0, 0, 0);

    // Helper to create flight departure and arrival times
    const createFlightTimes = (baseDate: Date, departureHour: number, durationHours: number) => {
      const departure = new Date(baseDate);
      departure.setHours(departureHour, Math.floor(Math.random() * 60), 0, 0);

      const arrival = new Date(departure);
      arrival.setHours(departure.getHours() + durationHours, departure.getMinutes() + Math.floor(Math.random() * 30), 0, 0);

      return { departure, arrival };
    };

    // Create JFK to CDG flights
    const jfkToCdgFlight1 = createFlightTimes(tomorrow, 8, 8);
    this.flights.set(this.currentFlightId++, {
      id: 1,
      originId: 1, // JFK
      destinationId: 6, // CDG
      departureTime: jfkToCdgFlight1.departure,
      arrivalTime: jfkToCdgFlight1.arrival,
      price: 699, // Legacy price
      capacity: 200, // Legacy capacity
      economyPrice: 699,
      businessPrice: 1299,
      firstClassPrice: 2499,
      economyCapacity: 150,
      businessCapacity: 40,
      firstClassCapacity: 10
    });

    const jfkToCdgFlight2 = createFlightTimes(tomorrow, 11, 7);
    this.flights.set(this.currentFlightId++, {
      id: 2,
      originId: 1, // JFK
      destinationId: 6, // CDG
      departureTime: jfkToCdgFlight2.departure,
      arrivalTime: jfkToCdgFlight2.arrival,
      price: 749, // Legacy price
      capacity: 150, // Legacy capacity
      economyPrice: 749,
      businessPrice: 1399,
      firstClassPrice: 2599,
      economyCapacity: 110,
      businessCapacity: 30,
      firstClassCapacity: 10
    });

    const jfkToCdgFlight3 = createFlightTimes(tomorrow, 15, 7);
    this.flights.set(this.currentFlightId++, {
      id: 3,
      originId: 1, // JFK
      destinationId: 6, // CDG
      departureTime: jfkToCdgFlight3.departure,
      arrivalTime: jfkToCdgFlight3.arrival,
      price: 599, // Legacy price
      capacity: 180, // Legacy capacity
      economyPrice: 599,
      businessPrice: 1199,
      firstClassPrice: 2399,
      economyCapacity: 140,
      businessCapacity: 30,
      firstClassCapacity: 10
    });

    // Create LAX to HND flights
    const laxToHndFlight = createFlightTimes(nextWeek, 10, 12);
    this.flights.set(this.currentFlightId++, {
      id: 4,
      originId: 2, // LAX
      destinationId: 7, // HND
      departureTime: laxToHndFlight.departure,
      arrivalTime: laxToHndFlight.arrival,
      price: 1200, // Legacy price
      capacity: 250, // Legacy capacity
      economyPrice: 1200,
      businessPrice: 2499,
      firstClassPrice: 4999,
      economyCapacity: 200,
      businessCapacity: 35,
      firstClassCapacity: 15
    });

    // Create DFW to LHR flights
    const dfwToLhrFlight = createFlightTimes(nextWeek, 18, 9);
    this.flights.set(this.currentFlightId++, {
      id: 5,
      originId: 4, // DFW
      destinationId: 5, // LHR
      departureTime: dfwToLhrFlight.departure,
      arrivalTime: dfwToLhrFlight.arrival,
      price: 850, // Legacy price
      capacity: 220, // Legacy capacity
      economyPrice: 850,
      businessPrice: 1750,
      firstClassPrice: 3450,
      economyCapacity: 170,
      businessCapacity: 40,
      firstClassCapacity: 10
    });

    this.currentUserId = 2; // Start from 2 since we already have admin
    this.currentLocationId = 11; // Start from 11 since we have 10 locations
    this.currentFlightId = 6; // Start from 6 since we have 5 flights
    this.currentPaymentAccountId = 2; // Start from 2 since we have 1 payment account
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    // Ensure isAdmin is a boolean
    const user: User = {
      ...insertUser,
      id,
      isAdmin: insertUser.isAdmin || false // Default to false if not provided
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }

    const updatedUser: User = {
      ...existingUser,
      ...userData,
      id // Ensure the ID stays the same
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const exists = this.users.has(id);

    if (exists) {
      // Check if user has bookings
      const hasBookings = Array.from(this.bookings.values()).some(
        (booking) => booking.userId === id
      );

      if (hasBookings) {
        throw new Error("Cannot delete user with associated bookings");
      }

      this.users.delete(id);
    }

    return exists;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getLocationByCode(code: string): Promise<Location | undefined> {
    return Array.from(this.locations.values()).find(
      (location) => location.code.toLowerCase() === code.toLowerCase(),
    );
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.currentLocationId++;
    const location: Location = { ...insertLocation, id };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(id: number, insertLocation: InsertLocation): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) {
      return undefined;
    }

    const updatedLocation: Location = { ...insertLocation, id };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const exists = this.locations.has(id);
    if (exists) {
      // Check if there are flights using this location
      const hasFlights = Array.from(this.flights.values()).some(
        (flight) => flight.originId === id || flight.destinationId === id
      );

      if (hasFlights) {
        throw new Error("Cannot delete location with associated flights");
      }

      this.locations.delete(id);
    }
    return exists;
  }

  // Flight methods
  async getAllFlights(): Promise<FlightWithLocations[]> {
    return Array.from(this.flights.values()).map(flight => this.enhanceFlightWithLocations(flight));
  }

  async getFlight(id: number): Promise<Flight | undefined> {
    return this.flights.get(id);
  }

  async getFlightWithLocations(id: number): Promise<FlightWithLocations | undefined> {
    const flight = this.flights.get(id);
    if (!flight) {
      return undefined;
    }

    return this.enhanceFlightWithLocations(flight);
  }

  private enhanceFlightWithLocations(flight: Flight): FlightWithLocations {
    const origin = this.locations.get(flight.originId);
    const destination = this.locations.get(flight.destinationId);

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
    const id = this.currentFlightId++;
    const flight: Flight = { ...insertFlight, id };
    this.flights.set(id, flight);
    return flight;
  }

  async updateFlight(id: number, insertFlight: InsertFlight): Promise<Flight | undefined> {
    const existingFlight = this.flights.get(id);
    if (!existingFlight) {
      return undefined;
    }

    const updatedFlight: Flight = { ...insertFlight, id };
    this.flights.set(id, updatedFlight);
    return updatedFlight;
  }

  async deleteFlight(id: number): Promise<boolean> {
    const exists = this.flights.has(id);
    if (exists) {
      // Check if there are bookings for this flight
      const hasBookings = Array.from(this.bookings.values()).some(
        (booking) => booking.flightId === id
      );

      if (hasBookings) {
        throw new Error("Cannot delete flight with associated bookings");
      }

      this.flights.delete(id);
    }
    return exists;
  }

  async searchFlights(originCode: string, destinationCode: string, date: Date): Promise<FlightWithLocations[]> {
    // Find location IDs by code
    const origin = Array.from(this.locations.values()).find(
      loc => loc.code.toLowerCase() === originCode.toLowerCase()
    );

    const destination = Array.from(this.locations.values()).find(
      loc => loc.code.toLowerCase() === destinationCode.toLowerCase()
    );

    if (!origin || !destination) {
      return [];
    }

    // Convert date to start/end of day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Filter flights
    const matchingFlights = Array.from(this.flights.values()).filter(flight => {
      const departureTime = new Date(flight.departureTime);
      return (
        flight.originId === origin.id &&
        flight.destinationId === destination.id &&
        departureTime >= startDate &&
        departureTime <= endDate
      );
    });

    // Enhance with location data
    return matchingFlights.map(flight => this.enhanceFlightWithLocations(flight));
  }

  // Booking methods
  async getAllBookings(): Promise<BookingWithDetails[]> {
    return Promise.all(
      Array.from(this.bookings.values()).map(booking => this.enhanceBookingWithDetails(booking))
    );
  }

  async getBookingById(id: number): Promise<BookingWithDetails | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }

    return this.enhanceBookingWithDetails(booking);
  }

  async getBookingsByUserId(userId: number): Promise<BookingWithDetails[]> {
    const userBookings = Array.from(this.bookings.values()).filter(
      booking => booking.userId === userId
    );

    return Promise.all(
      userBookings.map(booking => this.enhanceBookingWithDetails(booking))
    );
  }

  private async enhanceBookingWithDetails(booking: Booking): Promise<BookingWithDetails> {
    const user = this.users.get(booking.userId);
    const flight = this.flights.get(booking.flightId);

    if (!user || !flight) {
      throw new Error(`Could not find user or flight for booking ${booking.id}`);
    }

    const flightWithLocations = this.enhanceFlightWithLocations(flight);

    return {
      ...booking,
      user,
      flight: flightWithLocations
    };
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;

    // Create booking with proper typing
    const booking: Booking = {
      id,
      userId: insertBooking.userId,
      flightId: insertBooking.flightId,
      bookingDate: new Date(),
      passengerFirstName: insertBooking.passengerFirstName,
      passengerLastName: insertBooking.passengerLastName,
      passengerEmail: insertBooking.passengerEmail,
      passengerPhone: insertBooking.passengerPhone,
      travelClass: insertBooking.travelClass || "Economy", // Default to Economy if not specified
      ticketPrice: insertBooking.ticketPrice || 0, // Should always be specified, but default to 0 for safety
      status: "Pending",
      paymentReference: null,
      paymentProof: null,
      receiptPath: null,
      declineReason: null
    };

    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingStatus(id: number, status: string, declineReason?: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }

    const updatedBooking: Booking = {
      ...booking,
      status,
      declineReason: status === "Declined" && declineReason ? declineReason : booking.declineReason
    };

    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async updateBookingPayment(id: number, payment: { paymentReference?: string, paymentProof?: string, receiptPath?: string }): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }

    const updatedBooking: Booking = {
      ...booking,
      paymentReference: payment.paymentReference ?? booking.paymentReference,
      paymentProof: payment.paymentProof ?? booking.paymentProof,
      receiptPath: payment.receiptPath ?? booking.receiptPath
    };

    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async updateBookingReceipt(id: number, receiptPath: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }

    const updatedBooking: Booking = {
      ...booking,
      receiptPath
    };

    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    const exists = this.bookings.has(id);
    if (exists) {
      this.bookings.delete(id);
    }
    return exists;
  }

  async deleteManyBookings(ids: number[]): Promise<number> {
    let deletedCount = 0;

    for (const id of ids) {
      if (this.bookings.has(id)) {
        this.bookings.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Payment Account methods
  async getPaymentAccounts(): Promise<PaymentAccount[]> {
    return Array.from(this.paymentAccounts.values());
  }

  async updatePaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount> {
    // We always update the first payment account for simplicity
    const existingAccount = Array.from(this.paymentAccounts.values())[0];
    let id = 1;

    if (existingAccount) {
      id = existingAccount.id;
    } else {
      id = this.currentPaymentAccountId++;
    }

    // Ensure all optional fields have null values if undefined
    const updatedAccount: PaymentAccount = {
      id,
      bankName: account.bankName ?? null,
      accountName: account.accountName ?? null,
      accountNumber: account.accountNumber ?? null,
      swiftCode: account.swiftCode ?? null,
      bankInstructions: account.bankInstructions ?? "Please include your booking reference in the payment description.",
      mobileProvider: account.mobileProvider ?? null,
      mobileNumber: account.mobileNumber ?? null,
      mobileInstructions: account.mobileInstructions ?? "Upload a screenshot of the payment confirmation.",
      bankEnabled: account.bankEnabled === undefined ? true : account.bankEnabled,
      mobileEnabled: account.mobileEnabled === undefined ? true : account.mobileEnabled,
      taxRate: account.taxRate === undefined ? 0.13 : account.taxRate,
      serviceFeeRate: account.serviceFeeRate === undefined ? 0.04 : account.serviceFeeRate
    };
    this.paymentAccounts.set(id, updatedAccount);

    return updatedAccount;
  }

  // Site Settings methods
  async getSiteSettings(): Promise<SiteSetting[]> {
    return Array.from(this.siteSettings.values());
  }

  async getSiteSettingByKey(key: string): Promise<SiteSetting | undefined> {
    return Array.from(this.siteSettings.values()).find(
      (setting) => setting.key === key
    );
  }

  async upsertSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    // Check if setting already exists
    const existingSetting = await this.getSiteSettingByKey(setting.key);

    if (existingSetting) {
      // Update existing setting
      const updatedSetting: SiteSetting = {
        ...existingSetting,
        value: setting.value ?? null,
        updatedAt: new Date()
      };
      this.siteSettings.set(existingSetting.id, updatedSetting);
      return updatedSetting;
    } else {
      // Create new setting
      const id = this.currentSiteSettingId++;
      const newSetting: SiteSetting = {
        id,
        key: setting.key,
        value: setting.value ?? null,
        updatedAt: new Date()
      };
      this.siteSettings.set(id, newSetting);
      return newSetting;
    }
  }

  async deleteSiteSetting(key: string): Promise<boolean> {
    const setting = await this.getSiteSettingByKey(key);
    if (!setting) {
      return false;
    }
    return this.siteSettings.delete(setting.id);
  }

  // Page Content methods
  async getAllPageContents(): Promise<PageContent[]> {
    return Array.from(this.pageContents.values());
  }

  async getPageContentBySlug(slug: string): Promise<PageContent | undefined> {
    return Array.from(this.pageContents.values()).find(
      (content) => content.slug === slug
    );
  }

  async createPageContent(content: InsertPageContent): Promise<PageContent> {
    const id = this.currentPageContentId++;
    const newContent: PageContent = {
      ...content,
      id,
      updatedAt: new Date()
    };

    this.pageContents.set(id, newContent);
    return newContent;
  }

  async updatePageContent(id: number, content: Partial<InsertPageContent>): Promise<PageContent | undefined> {
    const existingContent = this.pageContents.get(id);
    if (!existingContent) {
      return undefined;
    }

    const updatedContent: PageContent = {
      ...existingContent,
      ...content,
      updatedAt: new Date()
    };

    this.pageContents.set(id, updatedContent);
    return updatedContent;
  }

  async deletePageContent(id: number): Promise<boolean> {
    const exists = this.pageContents.has(id);
    if (exists) {
      this.pageContents.delete(id);
    }
    return exists;
  }
}

// Import the DatabaseStorage class
import { DatabaseStorage } from "./storage-db";

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
