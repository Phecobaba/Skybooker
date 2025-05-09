import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Upload, Check, AlertCircle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingStatusSteps from "@/components/BookingStatusSteps";
import PaymentMethodCard from "@/components/PaymentMethodCard";
import FileUpload from "@/components/FileUpload";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookingWithDetails, PaymentAccount } from "@shared/schema";
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
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Helmet } from "react-helmet";

const paymentSchema = z.object({
  paymentReference: z.string().optional(),
});

// Make sure the inferred type treats paymentReference as string (not string | undefined)
type PaymentFormValues = {
  paymentReference: string;
};

export default function PaymentPage() {
  const { bookingId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(6);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Steps for the booking process
  const steps = [
    { step: 1, label: "Select Flight", status: "completed" as const },
    { step: 2, label: "Passenger Details", status: "completed" as const },
    { step: 3, label: "Payment", status: "active" as const },
    { step: 4, label: "Confirmation", status: "upcoming" as const },
  ];

  // Fetch booking details
  const {
    data: booking,
    isLoading: bookingLoading,
    error: bookingError,
  } = useQuery<BookingWithDetails>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
  });

  // Fetch payment account details
  const { data: paymentAccounts = [], isLoading: accountsLoading } = useQuery<
    PaymentAccount[]
  >({
    queryKey: ["/api/payment-accounts"],
  });

  // Form setup with validation
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentReference: "",
    },
  });
  
  // Handle redirect after successful payment submission
  useEffect(() => {
    let redirectTimer: number | null = null;
    let countdownTimer: number | null = null;
    
    if (paymentSuccess) {
      // Start countdown for user feedback
      countdownTimer = window.setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            // Clear the interval when we reach 0
            if (countdownTimer) window.clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Redirect after a delay to ensure user sees the success message
      redirectTimer = window.setTimeout(() => {
        navigate("/my-bookings");
      }, 6000); // 6 seconds to give users time to see success message
    }
    
    // Cleanup function to clear the timers if component unmounts
    return () => {
      if (redirectTimer) window.clearTimeout(redirectTimer);
      if (countdownTimer) window.clearInterval(countdownTimer);
    };
  }, [paymentSuccess, navigate]);

  // Payment proof upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      bookingId,
      formData,
    }: {
      bookingId: number;
      formData: FormData;
    }) => {
      const res = await fetch(`/api/bookings/${bookingId}/payment`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to upload payment proof");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      // First set success state
      setPaymentSuccess(true);
      
      // Show toast notification
      toast({
        title: "Payment information submitted",
        description: "Your payment will be verified shortly.",
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      // Directly redirect instead of waiting for the effect to trigger
      // Give a short delay for the success state to be visible first
      setTimeout(() => {
        navigate("/my-bookings");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment submission failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    if (!booking) return;
    
    // Verify payment file is selected
    if (!paymentFile) {
      toast({
        title: "Payment proof required",
        description: "Please upload a proof of payment before submitting",
        variant: "destructive",
      });
      return false;
    }
    
    // Set submitting state to show loading indicator
    setIsSubmitting(true);
    
    // Create form data with payment information
    const formData = new FormData();
    
    // Only append paymentReference if provided
    if (values.paymentReference) {
      formData.append("paymentReference", values.paymentReference);
    }
    
    // Add payment file
    formData.append("paymentProof", paymentFile);
    
    // Submit the payment information
    uploadMutation.mutate({
      bookingId: booking.id,
      formData,
    });
    
    // Return false to prevent default form submission
    return false;
  };

  const handleFileSelect = (file: File) => {
    setPaymentFile(file);
  };

  // Handle going back to booking details
  const handleBack = () => {
    navigate(`/booking/${booking?.flightId}`);
  };

  const calculateTotalPrice = (basePrice: number, taxRate: number, serviceFeeRate: number): number => {
    const taxesAndFees = basePrice * taxRate;
    const serviceFee = basePrice * serviceFeeRate;
    return basePrice + taxesAndFees + serviceFee;
  };

  if (bookingLoading || accountsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading payment details...</span>
      </div>
    );
  }

  if (bookingError || !booking) {
    return (
      <div className="flex justify-center items-center min-h-screen flex-col">
        <h1 className="text-2xl font-bold text-red-500">Error loading booking</h1>
        <p className="mt-2">Unable to load booking details. Please try again.</p>
        <Button onClick={() => navigate("/my-bookings")} className="mt-4">
          Back to My Bookings
        </Button>
      </div>
    );
  }

  // Get the first payment account
  const paymentAccount = paymentAccounts.length > 0 ? paymentAccounts[0] : null;
  
  // Use dynamic rates from payment account settings, or fall back to defaults
  const taxRate = paymentAccount?.taxRate ?? 0.13; // Default to 13% if not set
  const serviceFeeRate = paymentAccount?.serviceFeeRate ?? 0.04; // Default to 4% if not set
  
  // Use the ticketPrice stored in the booking record (which is already set based on travel class)
  const basePrice = booking.ticketPrice;
  const totalPrice = calculateTotalPrice(basePrice, taxRate, serviceFeeRate);
  const taxesAndFees = basePrice * taxRate;
  const serviceFee = basePrice * serviceFeeRate;
  
  // Check if any payment methods are enabled
  const hasBankEnabled = paymentAccount?.bankEnabled ?? false;
  const hasMobileEnabled = paymentAccount?.mobileEnabled ?? false;
  const hasNoPaymentMethodsEnabled = !hasBankEnabled && !hasMobileEnabled;

  return (
    <>
      <Helmet>
        <title>Payment | SkyBooker</title>
        <meta name="description" content="Complete your payment for your flight booking. Upload payment proof and provide reference number to confirm your booking." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Payment</h2>
              
              {/* Booking Steps */}
              <BookingStatusSteps steps={steps} className="mb-8" />

              {/* Payment Success Message - Made more prominent */}
              {paymentSuccess && (
                <div className="mb-8">
                  <Alert className="bg-green-100 border-green-500 shadow-lg">
                    <Check className="h-6 w-6 text-green-600" />
                    <AlertTitle className="text-green-800 text-2xl font-bold">Payment Submitted Successfully!</AlertTitle>
                    <AlertDescription className="text-green-700 text-lg">
                      <p className="mb-2">Your payment proof has been submitted and is being processed. You will be redirected to your bookings page in <span className="font-bold text-green-700">{redirectCountdown}</span> seconds...</p>
                      <p>You will receive an email confirmation once your payment is verified.</p>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payment Instructions */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-md p-5 mb-6">
                    <h3 className="text-lg font-bold mb-4">Payment Instructions</h3>
                    
                    {!paymentSuccess && (
                      <>
                        <div className="mb-6 border-b pb-4">
                          {hasNoPaymentMethodsEnabled ? (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Payment methods unavailable</AlertTitle>
                              <AlertDescription>
                                All payment methods are currently disabled. Please contact customer support to complete your payment.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <>
                              <p className="text-gray-700 mb-3">
                                Please use one of the following payment methods to complete your booking:
                              </p>
                              
                              {paymentAccount ? (
                                <PaymentMethodCard paymentAccount={paymentAccount} />
                              ) : (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle>Payment information unavailable</AlertTitle>
                                  <AlertDescription>
                                    Please contact customer support to complete your payment.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </>
                          )}
                        </div>

                        <Form {...form}>
                          <form 
                            ref={formRef}
                            onSubmit={form.handleSubmit(onSubmit)} 
                            className="space-y-6"
                          >
                            <div>
                              <h4 className="font-bold mb-3">Upload Payment Proof</h4>
                              <p className="text-gray-700 mb-4">
                                After making your payment, please upload a proof of payment below (screenshot, reference number, etc.).
                              </p>
                              
                              <FileUpload
                                onFileSelect={handleFileSelect}
                                accept="image/*"
                              />

                              <div className="mt-6">
                                <FormField
                                  control={form.control}
                                  name="paymentReference"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Payment Reference Number (optional)
                                      </FormLabel>
                                      <FormControl>
                                        <Input 
                                          placeholder="Leave empty for auto-generated reference" 
                                          {...field} 
                                        />
                                      </FormControl>
                                      <p className="text-sm text-gray-500 mt-1">
                                        A transaction reference will be automatically generated if not provided.
                                      </p>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>

                            <div className="lg:hidden mt-6">
                              <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-orange-500 hover:bg-orange-600"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  "Complete Booking"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="w-full mt-2"
                                disabled={isSubmitting}
                              >
                                Back to Passenger Details
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </>
                    )}
                    
                    {paymentSuccess && (
                      <div className="py-8 flex flex-col items-center justify-center bg-green-50 rounded-lg border-2 border-green-500">
                        <div className="bg-green-100 rounded-full p-4 mb-4">
                          <Check className="h-16 w-16 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-center mb-3 text-green-800">Payment Submitted!</h3>
                        <p className="text-center text-green-700 text-lg px-8 mb-4">
                          Your payment proof has been submitted successfully. You will be redirected to your bookings page in <span className="font-bold">{redirectCountdown}</span> seconds.
                        </p>
                        <div className="w-64 h-2 bg-gray-200 rounded-full mb-3">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all duration-1000"
                            style={{ width: `${(redirectCountdown / 6) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-center text-gray-600">
                          Thank you for choosing SkyBooker!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-md p-5 sticky top-6">
                    <h3 className="text-lg font-bold mb-4">Booking Summary</h3>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Flight (1 Adult - {booking.travelClass})</span>
                        <span>${basePrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxes & Fees</span>
                        <span>${taxesAndFees.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Fee</span>
                        <span>${serviceFee.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <span className="text-xl font-bold text-primary">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
                      <p className="mb-2">
                        Your booking will be confirmed once payment is verified.
                      </p>
                      <p>
                        Payment status:{" "}
                        <span className="text-yellow-500 font-medium">
                          Pending
                        </span>
                      </p>
                    </div>

                    {!paymentSuccess && (
                      <div className="mt-6 hidden lg:block">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          onClick={() => formRef.current?.requestSubmit()}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Complete Booking"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          className="w-full mt-2"
                          disabled={isSubmitting}
                        >
                          Back to Passenger Details
                        </Button>
                      </div>
                    )}
                    
                    {paymentSuccess && (
                      <div className="mt-6 hidden lg:block">
                        <Button
                          type="button"
                          className="w-full"
                          disabled
                        >
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting in {redirectCountdown}s...
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
