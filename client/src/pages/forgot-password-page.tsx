import { useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, Mail, XCircle } from "lucide-react";

// Reset request schema
const resetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Reset request form
  const form = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Reset request mutation
  const resetRequestMutation = useMutation({
    mutationFn: async (values: ResetRequestValues) => {
      const res = await apiRequest("POST", "/api/forgot-password", {
        email: values.email,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send reset link");
      }
      
      return await res.json();
    },
    onMutate: () => {
      setStatus("loading");
    },
    onSuccess: (data) => {
      setStatus("success");
      toast({
        title: "Request Sent",
        description: "If the email exists, a password reset link has been sent.",
      });
      
      // If in development mode and a token is returned, display it
      if (data.debug && data.debug.resetToken) {
        console.log("Development mode: Reset token for testing:", data.debug.resetToken);
        toast({
          title: "Development Token",
          description: `Reset token for testing: ${data.debug.resetToken}`,
          duration: 10000,
        });
      }
    },
    onError: (error: Error) => {
      setStatus("error");
      setErrorMessage(error.message);
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: ResetRequestValues) => {
    resetRequestMutation.mutate(data);
  };
  
  return (
    <>
      <Helmet>
        <title>Forgot Password | SkyBooker</title>
        <meta name="description" content="Request a password reset for your SkyBooker account." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-grow bg-gray-50 py-12">
          <div className="max-w-md mx-auto px-4 sm:px-6">
            <Card className="shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Forgot Your Password?</CardTitle>
                <CardDescription className="text-center">
                  Enter your email address below and we'll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {status === "success" ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-4">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                      <h3 className="text-xl font-bold text-center">Check Your Email</h3>
                      <p className="text-center text-gray-500 mt-2">
                        If an account exists with the email you provided, we've sent a password reset link.
                      </p>
                    </div>
                  </div>
                ) : status === "error" ? (
                  <Alert variant="destructive" className="mb-6">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Request Failed</AlertTitle>
                    <AlertDescription>
                      {errorMessage || "There was an error sending the reset link. Please try again or contact support."}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                                <Input
                                  type="email"
                                  placeholder="Enter your email address"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={status === "loading"}
                      >
                        {status === "loading" ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Sending Reset Link...</span>
                          </div>
                        ) : (
                          <span>Send Reset Link</span>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col gap-2">
                <div className="text-sm text-gray-500 text-center mt-2">
                  Remember your password?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary/80 hover:text-primary"
                    onClick={() => navigate("/auth")}
                  >
                    Back to Login
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}