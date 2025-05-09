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
import { Switch } from "@/components/ui/switch";
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
      bankInstructions: "",
      mobileProvider: "",
      mobileNumber: "",
      mobileInstructions: "",
      bankEnabled: true,
      mobileEnabled: true,
      taxRate: 0.13,
      serviceFeeRate: 0.04,
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
        bankInstructions: account.bankInstructions || "",
        mobileProvider: account.mobileProvider || "",
        mobileNumber: account.mobileNumber || "",
        mobileInstructions: account.mobileInstructions || "",
        bankEnabled: account.bankEnabled === false ? false : true,
        mobileEnabled: account.mobileEnabled === false ? false : true,
        taxRate: account.taxRate || 0.13, // Default to 13% if not set
        serviceFeeRate: account.serviceFeeRate || 0.04, // Default to 4% if not set
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
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="mb-6">
                              <Card className="border border-gray-200">
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-center mb-4">
                                    <div>
                                      <h3 className="text-md font-medium">Payment Methods Availability</h3>
                                      <p className="text-sm text-muted-foreground">Enable or disable payment methods for your customers</p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <FormField
                                      control={form.control}
                                      name="bankEnabled"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                          <div className="space-y-0.5">
                                            <FormLabel className="text-base">Bank Transfer</FormLabel>
                                            <FormDescription>
                                              Allow customers to pay via bank transfer
                                            </FormDescription>
                                          </div>
                                          <FormControl>
                                            <Switch
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={form.control}
                                      name="mobileEnabled"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                          <div className="space-y-0.5">
                                            <FormLabel className="text-base">Mobile Money</FormLabel>
                                            <FormDescription>
                                              Allow customers to pay via mobile money
                                            </FormDescription>
                                          </div>
                                          <FormControl>
                                            <Switch
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                            
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                              <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                                <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
                                <TabsTrigger value="fees">Fees & Taxes</TabsTrigger>
                              </TabsList>
                              
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

                              <TabsContent value="fees" className="space-y-4">
                                <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-md mb-6">
                                  <p className="text-blue-800 text-sm">
                                    These rates are applied to all bookings. The tax rate and service fee are calculated as a percentage of the base flight price.
                                  </p>
                                </div>

                                <FormField
                                  control={form.control}
                                  name="taxRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Tax Rate (%)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="text" 
                                          inputMode="decimal" 
                                          placeholder="e.g. 13" 
                                          // Don't spread all field props to avoid value conflicts
                                          name={field.name}
                                          onBlur={(e) => {
                                            const value = e.target.value.trim();
                                            
                                            // On blur, if field is empty, set to 0
                                            if (value === "") {
                                              field.onChange(0);
                                              field.onBlur();
                                              return;
                                            }
                                            
                                            // Convert string to decimal on blur
                                            if (typeof field.value === 'string') {
                                              const numValue = parseFloat(field.value);
                                              if (!isNaN(numValue)) {
                                                // Convert percentage to decimal (e.g., 13 -> 0.13)
                                                field.onChange(numValue / 100);
                                              } else {
                                                // If invalid, reset to 0
                                                field.onChange(0);
                                              }
                                            }
                                            
                                            field.onBlur();
                                          }}
                                          ref={field.ref}
                                          // Display the percentage value (e.g., 13 instead of 0.13)
                                          // Only format when there's a value
                                          value={field.value !== undefined && field.value !== null && field.value !== 0 
                                            ? (typeof field.value === 'string' ? field.value : field.value * 100) 
                                            : ""}
                                          onChange={(e) => {
                                            const inputValue = e.target.value;
                                            
                                            // Allow empty field
                                            if (inputValue === "") {
                                              field.onChange("");
                                              return;
                                            }
                                            
                                            // Accept more decimal formats:
                                            // - Allow numbers (123)
                                            // - Allow decimal point with digits on either side (1.23 or 1.)
                                            // - Allow decimal point at start (.23)
                                            if (!/^[0-9]*\.?[0-9]*$/.test(inputValue)) {
                                              return;
                                            }
                                            
                                            // Directly store the input value during editing
                                            field.onChange(inputValue);
                                          }}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        The tax rate as a percentage (e.g., 13 for 13% tax rate)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="serviceFeeRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Service Fee Rate (%)</FormLabel>
                                      <FormControl>
                                        <Input 
                                          type="text" 
                                          inputMode="decimal" 
                                          placeholder="e.g. 4" 
                                          // Don't spread all field props to avoid value conflicts
                                          name={field.name}
                                          onBlur={(e) => {
                                            const value = e.target.value.trim();
                                            
                                            // On blur, if field is empty, set to a 0
                                            if (value === "") {
                                              field.onChange(0);
                                              field.onBlur();
                                              return;
                                            }
                                            
                                            // Convert string to decimal on blur
                                            if (typeof field.value === 'string') {
                                              const numValue = parseFloat(field.value);
                                              if (!isNaN(numValue)) {
                                                // Convert percentage to decimal (e.g., 4 -> 0.04)
                                                field.onChange(numValue / 100);
                                              } else {
                                                // If invalid, reset to 0
                                                field.onChange(0);
                                              }
                                            }
                                            
                                            field.onBlur();
                                          }}
                                          ref={field.ref}
                                          // Display the percentage value (e.g., 4 instead of 0.04)
                                          // Only format when there's a value
                                          value={field.value !== undefined && field.value !== null && field.value !== 0 
                                            ? (typeof field.value === 'string' ? field.value : field.value * 100) 
                                            : ""}
                                          onChange={(e) => {
                                            const inputValue = e.target.value;
                                            
                                            // Allow empty field
                                            if (inputValue === "") {
                                              field.onChange("");
                                              return;
                                            }
                                            
                                            // Accept more decimal formats:
                                            // - Allow numbers (123)
                                            // - Allow decimal point with digits on either side (1.23 or 1.)
                                            // - Allow decimal point at start (.23)
                                            if (!/^[0-9]*\.?[0-9]*$/.test(inputValue)) {
                                              return;
                                            }
                                            
                                            // Directly store the input value during editing
                                            field.onChange(inputValue);
                                          }}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        The service fee rate as a percentage (e.g., 4 for 4% service fee)
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="mt-6 p-4 border rounded-md bg-gray-50">
                                  <h4 className="font-medium mb-3">Example Calculation</h4>
                                  <div className="space-y-2">
                                    <p><strong>Base Flight Price:</strong> $100.00</p>
                                    {/* Get percentage display value for tax rate */}
                                    {(() => {
                                      const taxRate = form.watch("taxRate");
                                      // Handle when taxRate is a string (during editing)
                                      const numericTaxRate = typeof taxRate === 'string' ? 0 : taxRate || 0;
                                      const taxAmount = 100 * numericTaxRate;
                                      const percentDisplay = typeof taxRate === 'number' ? 
                                        (numericTaxRate * 100).toFixed(1) : '0.0';
                                      
                                      return (
                                        <p>
                                          <strong>Tax ({percentDisplay}%):</strong> ${taxAmount.toFixed(2)}
                                        </p>
                                      );
                                    })()}
                                    
                                    {/* Get percentage display value for service fee rate */}
                                    {(() => {
                                      const feeRate = form.watch("serviceFeeRate");
                                      // Handle when feeRate is a string (during editing)
                                      const numericFeeRate = typeof feeRate === 'string' ? 0 : feeRate || 0;
                                      const feeAmount = 100 * numericFeeRate;
                                      const percentDisplay = typeof feeRate === 'number' ? 
                                        (numericFeeRate * 100).toFixed(1) : '0.0';
                                      
                                      return (
                                        <p>
                                          <strong>Service Fee ({percentDisplay}%):</strong> ${feeAmount.toFixed(2)}
                                        </p>
                                      );
                                    })()}
                                    
                                    <div className="border-t pt-2 mt-2">
                                      {(() => {
                                        const taxRate = form.watch("taxRate");
                                        const feeRate = form.watch("serviceFeeRate");
                                        // Handle when rates are strings (during editing)
                                        const numericTaxRate = typeof taxRate === 'string' ? 0 : taxRate || 0;
                                        const numericFeeRate = typeof feeRate === 'string' ? 0 : feeRate || 0;
                                        const totalAmount = 100 + (100 * numericTaxRate) + (100 * numericFeeRate);
                                        
                                        return (
                                          <p>
                                            <strong>Total Price:</strong> ${totalAmount.toFixed(2)}
                                          </p>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>

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
                                <p className="mt-4 text-sm text-gray-500">
                                  Please use your booking reference number as the payment reference.
                                  After making the payment, upload a screenshot or receipt of the payment on the booking payment page.
                                </p>
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
                                <p className="mt-4 text-sm text-gray-500">
                                  Please use your booking reference number as the payment reference.
                                  After making the payment, upload a screenshot or receipt of the payment on the booking payment page.
                                </p>
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