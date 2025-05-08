import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
});

export const flights = pgTable("flights", {
  id: serial("id").primaryKey(),
  originId: integer("origin_id").notNull().references(() => locations.id),
  destinationId: integer("destination_id").notNull().references(() => locations.id),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  price: doublePrecision("price").notNull(),
  capacity: integer("capacity").notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  flightId: integer("flight_id").notNull().references(() => flights.id),
  bookingDate: timestamp("booking_date").defaultNow().notNull(),
  passengerFirstName: text("passenger_first_name").notNull(),
  passengerLastName: text("passenger_last_name").notNull(),
  passengerEmail: text("passenger_email").notNull(),
  passengerPhone: text("passenger_phone").notNull(),
  status: text("status").notNull().default("Pending"),
  paymentReference: text("payment_reference"),
  paymentProof: text("payment_proof"),
  receiptPath: text("receipt_path"),
  declineReason: text("decline_reason"),
});

export const paymentAccounts = pgTable("payment_accounts", {
  id: serial("id").primaryKey(),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  swiftCode: text("swift_code"),
  mobileProvider: text("mobile_provider"),
  mobileNumber: text("mobile_number"),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
// Flight schema that allows string dates (which will be converted to Date objects in the controller)
export const insertFlightSchema = createInsertSchema(flights).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true });
export const insertPaymentAccountSchema = createInsertSchema(paymentAccounts).omit({ id: true });

// Login Schema
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export type InsertFlight = z.infer<typeof insertFlightSchema>;
export type Flight = typeof flights.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertPaymentAccount = z.infer<typeof insertPaymentAccountSchema>;
export type PaymentAccount = typeof paymentAccounts.$inferSelect;

export type LoginData = z.infer<typeof loginSchema>;

// Flight search params
export const flightSearchSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  returnDate: z.string().optional()
});

export type FlightSearchParams = z.infer<typeof flightSearchSchema>;

// Enhanced types with joins
export type FlightWithLocations = Flight & {
  origin: Location;
  destination: Location;
};

export type BookingWithDetails = Booking & {
  user: User;
  flight: FlightWithLocations;
};
