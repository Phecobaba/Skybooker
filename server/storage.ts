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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  updateBookingPayment(id: number, payment: { paymentReference?: string, paymentProof?: string }): Promise<Booking | undefined>;

  // Payment Accounts
  getPaymentAccounts(): Promise<PaymentAccount[]>;
  updatePaymentAccount(account: InsertPaymentAccount): Promise<PaymentAccount>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private flights: Map<number, Flight>;
  private bookings: Map<number, Booking>;
  private paymentAccounts: Map<number, PaymentAccount>;
  
  sessionStore: session.SessionStore;
  
  currentUserId: number;
  currentLocationId: number;
  currentFlightId: number;
  currentBookingId: number;
  currentPaymentAccountId: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.flights = new Map();
    this.bookings = new Map();
    this.paymentAccounts = new Map();
    
    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentFlightId = 1;
    this.currentBookingId = 1;
    this.currentPaymentAccountId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create an initial admin user
    this.users.set(1, {
      id: 1,
      username: "admin",
      password: "8a1d5f83b96f7dd9e49e991a63603c5d8ea65ba19ac7444a079ea5ddf8b97cc8a50e7b33b618d94e9f7dd13b81e33812e7843575cec87e2de6cc1f6f6fc9c7a5.d4c6c53f30b4c29e2d8f524e7ca7bffe", // "adminpassword"
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
      mobileProvider: "PayMobile",
      mobileNumber: "+1 (555) 987-6543"
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
      price: 699,
      capacity: 200
    });
    
    const jfkToCdgFlight2 = createFlightTimes(tomorrow, 11, 7);
    this.flights.set(this.currentFlightId++, {
      id: 2,
      originId: 1, // JFK
      destinationId: 6, // CDG
      departureTime: jfkToCdgFlight2.departure,
      arrivalTime: jfkToCdgFlight2.arrival,
      price: 749,
      capacity: 150
    });
    
    const jfkToCdgFlight3 = createFlightTimes(tomorrow, 15, 7);
    this.flights.set(this.currentFlightId++, {
      id: 3,
      originId: 1, // JFK
      destinationId: 6, // CDG
      departureTime: jfkToCdgFlight3.departure,
      arrivalTime: jfkToCdgFlight3.arrival,
      price: 599,
      capacity: 180
    });
    
    // Create LAX to HND flights
    const laxToHndFlight = createFlightTimes(nextWeek, 10, 12);
    this.flights.set(this.currentFlightId++, {
      id: 4,
      originId: 2, // LAX
      destinationId: 7, // HND
      departureTime: laxToHndFlight.departure,
      arrivalTime: laxToHndFlight.arrival,
      price: 1200,
      capacity: 250
    });
    
    // Create DFW to LHR flights
    const dfwToLhrFlight = createFlightTimes(nextWeek, 18, 9);
    this.flights.set(this.currentFlightId++, {
      id: 5,
      originId: 4, // DFW
      destinationId: 5, // LHR
      departureTime: dfwToLhrFlight.departure,
      arrivalTime: dfwToLhrFlight.arrival,
      price: 850,
      capacity: 220
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    const booking: Booking = { 
      ...insertBooking, 
      id,
      bookingDate: new Date(),
      status: "Pending"
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }
    
    const updatedBooking: Booking = {
      ...booking,
      status
    };
    
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async updateBookingPayment(id: number, payment: { paymentReference?: string, paymentProof?: string }): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) {
      return undefined;
    }
    
    const updatedBooking: Booking = {
      ...booking,
      paymentReference: payment.paymentReference ?? booking.paymentReference,
      paymentProof: payment.paymentProof ?? booking.paymentProof
    };
    
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
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
    
    const updatedAccount: PaymentAccount = { ...account, id };
    this.paymentAccounts.set(id, updatedAccount);
    
    return updatedAccount;
  }
}

export const storage = new MemStorage();
