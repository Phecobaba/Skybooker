import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingStatusSteps from "@/components/BookingStatusSteps";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FlightWithLocations, InsertBooking } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet";

const passengerSchema = z.object({
  passengerFirstName: z.string().min(2, "First name is required"),
  passengerLastName: z.string().min(2, "Last name is required"),
  passengerEmail: z.string().email("Valid email is required"),
  passengerPhone: z.string().min(10, "Valid phone number is required"),
});

type PassengerFormValues = z.infer<typeof passengerSchema>;

export default function BookingPage() {
  const { flightId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Steps for the booking process
  const steps = [
    { step: 1, label: "Select Flight", status: "completed" as const },
    { step: 2, label: "Passenger Details", status: "active" as const },
    { step: 3, label: "Payment", status: "upcoming" as const },
    { step: 4, label: "Confirmation", status: "upcoming" as const },
  ];

  // Fetch flight details
  const {
    data: flight,
    isLoading: flightLoading,
    error: flightError,
  } = useQuery<FlightWithLocations>({
    queryKey: [`/api/flights/${flightId}`],
    enabled: !!flightId,
  });

  // Form setup with validation
  const form = useForm<PassengerFormValues>({
    resolver: zodResolver(passengerSchema),
    defaultValues: {
      passengerFirstName: user?.firstName || "",
      passengerLastName: user?.lastName || "",
      passengerEmail: user?.email || "",
      passengerPhone: "",
    },
  });

  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: InsertBooking) => {
      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Booking created",
        description: "Let's proceed to payment",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      navigate(`/payment/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PassengerFormValues) => {
    if (!flight || !user) return;

    const bookingData: InsertBooking = {
      userId: user.id,
      flightId: flight.id,
      ...values,
      status: "Pending",
    };

    bookingMutation.mutate(bookingData);
  };

  // Handle going back to search results
  const handleBack = () => {
    window.history.back();
  };

  if (flightLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading flight details...</span>
      </div>
    );
  }

  if (flightError || !flight) {
    return (
      <div className="flex justify-center items-center min-h-screen flex-col">
        <h1 className="text-2xl font-bold text-red-500">Error loading flight</h1>
        <p className="mt-2">Unable to load flight details. Please try again.</p>
        <Button onClick={handleBack} className="mt-4">
          Back to Search
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Complete Your Booking | SkyBooker</title>
        <meta name="description" content={`Complete your booking for flight from ${flight.origin.city} to ${flight.destination.city}. Enter passenger details and proceed to payment.`} />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Complete Your Booking</h2>
              
              {/* Booking Steps */}
              <BookingStatusSteps steps={steps} className="mb-8" />

              {/* Selected Flight Summary */}
              <div className="bg-white rounded-lg shadow-md p-5 mb-6">
                <div className="flex flex-col md:flex-row md:items-center border-b border-gray-200 pb-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">Your Flight</h3>
                    <div className="flex items-center">
                      <span className="text-sm bg-primary-100 text-primary px-2 py-1 rounded mr-2">
                        {flight.origin.code} to {flight.destination.code}
                      </span>
                      <span className="text-sm text-gray-600">
                        {format(new Date(flight.departureTime), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0">
                    <span className="text-lg font-bold text-primary">${flight.price.toFixed(2)}</span>
                    <span className="text-gray-500 text-sm ml-1">per person</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div>
                        <div className="text-lg font-bold">
                          {format(new Date(flight.departureTime), "h:mm a")}
                        </div>
                        <div className="text-gray-500">
                          {flight.origin.code} - {flight.origin.city}
                        </div>
                      </div>
                      <div className="mx-4 text-gray-400">→</div>
                      <div>
                        <div className="text-lg font-bold">
                          {format(new Date(flight.arrivalTime), "h:mm a")}
                        </div>
                        <div className="text-gray-500">
                          {flight.destination.code} - {flight.destination.city}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 text-sm text-gray-500">
                    <div>
                      Direct Flight •{" "}
                      {format(
                        new Date(flight.arrivalTime).getTime() - new Date(flight.departureTime).getTime(),
                        "h'h' mm'm'"
                      )}
                    </div>
                    <div>Economy Class</div>
                  </div>
                </div>
              </div>

              {/* Passenger Information Form */}
              <div className="bg-white rounded-lg shadow-md p-5">
                <h3 className="text-lg font-bold mb-4">Passenger Information</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="passengerFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="passengerLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="passengerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="passengerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="mr-3"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={bookingMutation.isPending}
                      >
                        {bookingMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Continue to Payment"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
