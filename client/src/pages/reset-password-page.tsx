import { useState, useEffect } from "react";
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
import { Loader2, CheckCircle2, Lock, XCircle } from "lucide-react";

// Password reset schema
const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Get token and email from URL query parameters
  const query = new URLSearchParams(window.location.search);
  const token = query.get("token") || "";
  const email = query.get("email") || "";
  
  // Reset password form
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: email,
      token: token,
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Auto-fill form fields from URL parameters
  useEffect(() => {
    if (email || token) {
      form.setValue("email", email);
      form.setValue("token", token);
    }
  }, [email, token, form]);
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (values: ResetPasswordFormValues) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        email: values.email,
        token: values.token,
        newPassword: values.newPassword,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset password");
      }
      
      return await res.json();
    },
    onMutate: () => {
      setStatus("loading");
    },
    onSuccess: () => {
      setStatus("success");
      toast({
        title: "Password Reset Successful",
        description: "Your password has been successfully reset. You can now login with your new password.",
      });
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    },
    onError: (error: Error) => {
      setStatus("error");
      setErrorMessage(error.message);
      toast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };
  
  return (
    <>
      <Helmet>
        <title>Reset Password | SkyBooker</title>
        <meta name="description" content="Reset your SkyBooker account password." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-grow bg-gray-50 py-12">
          <div className="max-w-md mx-auto px-4 sm:px-6">
            <Card className="shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Reset Your Password</CardTitle>
                <CardDescription className="text-center">
                  Enter your new password below to reset your account
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {status === "success" ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-4">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                      <h3 className="text-xl font-bold text-center">Password Reset Successful</h3>
                      <p className="text-center text-gray-500 mt-2">
                        Your password has been successfully reset. You will be redirected to the login page in a moment.
                      </p>
                    </div>
                  </div>
                ) : status === "error" ? (
                  <Alert variant="destructive" className="mb-6">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Reset Failed</AlertTitle>
                    <AlertDescription>
                      {errorMessage || "There was an error resetting your password. Please try again or contact support."}
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
                              <Input
                                placeholder="Enter your email address"
                                {...field}
                                disabled={!!email}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reset Token</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your reset token"
                                {...field}
                                disabled={!!token}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                                <Input
                                  type="password"
                                  placeholder="Enter your new password"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                                <Input
                                  type="password"
                                  placeholder="Confirm your new password"
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
                            <span>Resetting Password...</span>
                          </div>
                        ) : (
                          <span>Reset Password</span>
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