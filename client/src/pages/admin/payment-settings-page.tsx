import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AdminSidebar from "@/components/admin/Sidebar";
import { PaymentAccount, insertPaymentAccountSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AdminPaymentSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("bank");

  // Fetch payment accounts
  const {
    data: accounts = [],
    isLoading,
    error,
  } = useQuery<PaymentAccount[]>({
    queryKey: ["/api/payment-accounts"],
  });

  // Get the most recent account (which should be the one with the highest ID)
  const account = accounts.length > 0 
    ? accounts.sort((a, b) => b.id - a.id)[0] // Sort by ID descending and get the first one
    : null;

  // Form setup with empty defaults initially
  const form = useForm({
    resolver: zodResolver(insertPaymentAccountSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      swiftCode: "",
      mobileProvider: "",
      mobileNumber: "",
    },
    mode: "onChange",
  });

  // Update form values when account data loads or changes
  useEffect(() => {
    if (account) {
      console.log("Updating form with account:", account);
      form.reset({
        bankName: account.bankName || "",
        accountName: account.accountName || "",
        accountNumber: account.accountNumber || "",
        swiftCode: account.swiftCode || "",
        mobileProvider: account.mobileProvider || "",
        mobileNumber: account.mobileNumber || "",
      });
    }
  }, [accounts, form]); // Depend on the accounts array instead of just account

  // Save payment account details mutation
  const updatePaymentAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      // Include the ID if we're updating an existing account
      if (account?.id) {
        data.id = account.id;
      }
      
      const res = await apiRequest("POST", "/api/admin/payment-accounts", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-accounts"] });
      toast({
        title: "Payment settings updated",
        description: "The payment account details have been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating payment settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updatePaymentAccountMutation.mutate(data);
  };

  return (
    <>
      <Helmet>
        <title>Payment Settings | SkyBooker Admin</title>
        <meta
          name="description"
          content="Configure payment methods and account details for the booking system"
        />
      </Helmet>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                  Payment Settings
                </h1>

                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading payment settings...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500">
                      Error loading payment settings. Please try again.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Account Settings</CardTitle>
                        <CardDescription>
                          Configure the payment methods customers will use to make payments for their bookings.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                            <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
                          </TabsList>

                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                              <TabsContent value="bank" className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="bankName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Bank Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. Chase Bank" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        The name of the bank where you have your account.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="accountName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. SkyBooker Ltd" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        The name on the bank account.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="accountNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Account Number</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. 1234567890" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        Your bank account number.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="swiftCode"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>SWIFT/BIC Code</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. CHASUS33" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        The SWIFT or BIC code of your bank (for international transfers).
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="mobile" className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="mobileProvider"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Mobile Money Provider</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. M-Pesa, Orange Money" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        The mobile money service provider you use.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="mobileNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Mobile Money Number</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g. +1234567890" {...field} />
                                      </FormControl>
                                      <FormDescription>
                                        The phone number associated with your mobile money account.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <div className="flex justify-end">
                                <Button 
                                  type="submit" 
                                  disabled={updatePaymentAccountMutation.isPending || !form.formState.isDirty}
                                  className="flex items-center gap-2"
                                >
                                  {updatePaymentAccountMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                  <Save className="h-4 w-4" />
                                  Save Settings
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </Tabs>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Instructions</CardTitle>
                        <CardDescription>
                          These instructions will be shown to customers when they make a booking.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="bank-instructions">
                            <AccordionTrigger>Bank Transfer Instructions Preview</AccordionTrigger>
                            <AccordionContent>
                              <div className="p-4 border rounded-md bg-gray-50">
                                <h3 className="font-medium text-lg mb-2">Bank Transfer Instructions</h3>
                                <p className="mb-4">Please make your payment to the following bank account:</p>
                                <ul className="space-y-2">
                                  <li><strong>Bank:</strong> {form.watch("bankName") || "[Bank Name]"}</li>
                                  <li><strong>Account Name:</strong> {form.watch("accountName") || "[Account Name]"}</li>
                                  <li><strong>Account Number:</strong> {form.watch("accountNumber") || "[Account Number]"}</li>
                                  <li><strong>SWIFT/BIC Code:</strong> {form.watch("swiftCode") || "[SWIFT Code]"}</li>
                                </ul>
                                <p className="mt-4">After making the payment, please upload the proof of payment (receipt or screenshot) and provide the reference number.</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="mobile-instructions">
                            <AccordionTrigger>Mobile Money Instructions Preview</AccordionTrigger>
                            <AccordionContent>
                              <div className="p-4 border rounded-md bg-gray-50">
                                <h3 className="font-medium text-lg mb-2">Mobile Money Instructions</h3>
                                <p className="mb-4">Please make your payment to the following mobile money account:</p>
                                <ul className="space-y-2">
                                  <li><strong>Provider:</strong> {form.watch("mobileProvider") || "[Mobile Provider]"}</li>
                                  <li><strong>Number:</strong> {form.watch("mobileNumber") || "[Mobile Number]"}</li>
                                </ul>
                                <p className="mt-4">After making the payment, please upload the proof of payment (receipt or screenshot) and provide the reference number or transaction ID.</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}