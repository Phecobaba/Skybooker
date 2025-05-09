import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Search, Eye, Check, X } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import { BookingWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const itemsPerPage = 10;

  // Fetch all bookings
  const {
    data: bookings = [],
    isLoading,
    error,
  } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/bookings"],
  });

  // Get selected booking for detail view
  const selectedBooking = selectedBookingId
    ? bookings.find((booking) => booking.id === selectedBookingId)
    : null;

  // Filter bookings - show all pending payments regardless of payment reference
  const pendingPayments = bookings.filter(
    (booking) => 
      // Show all bookings with "Pending Payment" status
      booking.status === "Pending Payment" || 
      // Show "Pending" bookings only if they have payment reference or proof
      (booking.status === "Pending" && (booking.paymentReference || booking.paymentProof))
  );

  // Filter for search
  const filteredBookings = pendingPayments.filter((booking) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      `#BK-${booking.id}`.toLowerCase().includes(search) ||
      booking.passengerFirstName.toLowerCase().includes(search) ||
      booking.passengerLastName.toLowerCase().includes(search) ||
      booking.passengerEmail.toLowerCase().includes(search) ||
      booking.flight.origin.code.toLowerCase().includes(search) ||
      booking.flight.destination.code.toLowerCase().includes(search)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);

  // Update booking status mutation
  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      declineReason,
    }: {
      id: number;
      status: string;
      declineReason?: string;
    }) => {
      const res = await apiRequest("PUT", `/api/admin/bookings/${id}/status`, { status, declineReason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Payment status updated",
        description: "The payment status has been updated successfully",
      });
      setIsDetailModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating payment status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprovePayment = (bookingId: number) => {
    updateBookingStatusMutation.mutate({
      id: bookingId,
      status: "Paid",
    });
  };

  const openDeclineModal = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setDeclineReason("");
    setIsDeclineModalOpen(true);
  };
  
  const handleDeclinePayment = () => {
    if (!selectedBookingId) return;
    
    updateBookingStatusMutation.mutate({
      id: selectedBookingId,
      status: "Declined",
      declineReason: declineReason.trim() || undefined
    }, {
      onSuccess: () => {
        setIsDeclineModalOpen(false);
      }
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <Helmet>
        <title>Payment Management | SkyBooker Admin</title>
        <meta
          name="description"
          content="Review and approve customer payment proofs for flight bookings"
        />
      </Helmet>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                  Payment Management
                </h1>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search payments by passenger name, ID, or route..."
                      className="pl-10"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading payment data...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500">
                      Error loading payment data. Please try again.
                    </p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">
                      No pending payments found
                    </h3>
                    <p className="mt-2 text-gray-500">
                      {searchText
                        ? "No payments match your search criteria."
                        : "There are no pending payments that need review."}
                    </p>
                    {searchText && (
                      <Button
                        variant="outline"
                        onClick={() => setSearchText("")}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Booking ID
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Passenger
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Flight
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Amount
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Payment Info
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentBookings.map((booking) => (
                            <tr key={booking.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  #BK-{booking.id}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.passengerFirstName} {booking.passengerLastName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {booking.passengerEmail}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {booking.flight.origin.code} → {booking.flight.destination.code}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(booking.flight.departureTime), "MMM d, yyyy")}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  ${booking.ticketPrice ? 
                                    booking.ticketPrice.toFixed(2) : 
                                    (booking.travelClass === 'Business' 
                                      ? booking.flight.businessPrice.toFixed(2)
                                      : booking.travelClass === 'First Class'
                                        ? booking.flight.firstClassPrice.toFixed(2)
                                        : booking.flight.economyPrice.toFixed(2)
                                    )
                                  }
                                  <span className="text-xs text-gray-600 block mt-1">
                                    {booking.travelClass || 'Economy'} Class
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "mr-2", 
                                      booking.paymentReference 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-yellow-100 text-yellow-800"
                                    )}
                                  >
                                    {booking.paymentReference ? 'Has Reference' : 'No Reference'}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      booking.paymentProof 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-yellow-100 text-yellow-800"
                                    )}
                                  >
                                    {booking.paymentProof ? 'Has Proof' : 'No Proof'}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => {
                                    setSelectedBookingId(booking.id);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" /> Review
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <Button
                            variant="outline"
                            onClick={() =>
                              handlePageChange(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handlePageChange(Math.min(totalPages, currentPage + 1))
                            }
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                              <span className="font-medium">
                                {Math.min(indexOfLastItem, filteredBookings.length)}
                              </span>{" "}
                              of <span className="font-medium">{filteredBookings.length}</span> payments
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              <Button
                                variant="outline"
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                              >
                                <span className="sr-only">Previous</span>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </Button>
                              {Array.from({ length: totalPages }).map((_, i) => (
                                <Button
                                  key={i}
                                  variant={currentPage === i + 1 ? "default" : "outline"}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    currentPage === i + 1
                                      ? "z-10 bg-primary border-primary text-white"
                                      : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                  }`}
                                  onClick={() => handlePageChange(i + 1)}
                                >
                                  {i + 1}
                                </Button>
                              ))}
                              <Button
                                variant="outline"
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                              >
                                <span className="sr-only">Next</span>
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </Button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedBooking && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Payment Review - Booking #{selectedBooking.id}</DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Booking Information</h3>
                  <div className="mt-2 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Date:</span>{" "}
                      {format(new Date(selectedBooking.bookingDate), "PPP")}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Status:</span>{" "}
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-1",
                          selectedBooking.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : selectedBooking.status === "Confirmed"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {selectedBooking.status}
                      </Badge>
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Flight:</span>{" "}
                      {selectedBooking.flight.origin.city} ({selectedBooking.flight.origin.code}) to{" "}
                      {selectedBooking.flight.destination.city} ({selectedBooking.flight.destination.code})
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Departure:</span>{" "}
                      {format(new Date(selectedBooking.flight.departureTime), "PPP p")}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Amount:</span>{" "}
                      ${selectedBooking.ticketPrice ? 
                          selectedBooking.ticketPrice.toFixed(2) : 
                          (selectedBooking.travelClass === 'Business' 
                            ? selectedBooking.flight.businessPrice.toFixed(2)
                            : selectedBooking.travelClass === 'First Class'
                              ? selectedBooking.flight.firstClassPrice.toFixed(2)
                              : selectedBooking.flight.economyPrice.toFixed(2)
                          )
                        }
                      <span className="block mt-1 text-xs text-gray-500">
                        {selectedBooking.travelClass || 'Economy'} Class
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Passenger Information</h3>
                  <div className="mt-2 bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Name:</span>{" "}
                      {selectedBooking.passengerFirstName} {selectedBooking.passengerLastName}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Email:</span>{" "}
                      {selectedBooking.passengerEmail}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedBooking.passengerPhone}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Details</h3>
                <Tabs defaultValue="reference">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="reference">Reference Number</TabsTrigger>
                    <TabsTrigger value="proof">Payment Proof</TabsTrigger>
                  </TabsList>
                  <TabsContent value="reference">
                    <div className="bg-gray-50 p-4 rounded-md">
                      {selectedBooking.paymentReference ? (
                        <div className="text-sm font-medium">
                          <span className="text-gray-700">Reference Number:</span>{" "}
                          <span className="text-primary">{selectedBooking.paymentReference}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No payment reference provided</p>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="proof">
                    <div className="bg-gray-50 p-4 rounded-md">
                      {selectedBooking.paymentProof ? (
                        <div className="text-center">
                          <img
                            src={`/uploads/${selectedBooking.paymentProof}`}
                            alt="Payment Proof"
                            className="max-w-full h-auto mx-auto rounded-md"
                            style={{ maxHeight: "300px" }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No payment proof image uploaded</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DialogFooter>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => openDeclineModal(selectedBooking.id)}
                  variant="destructive"
                  disabled={updateBookingStatusMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline Payment
                </Button>
                <Button
                  onClick={() => handleApprovePayment(selectedBooking.id)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={updateBookingStatusMutation.isPending}
                >
                  {updateBookingStatusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve Payment
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Decline Payment Modal with Reason */}
      <Dialog open={isDeclineModalOpen} onOpenChange={setIsDeclineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Payment</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">Please provide a reason for declining this payment (optional):</p>
            <div className="space-y-4">
              <Input
                placeholder="Enter reason for declining payment"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                This reason will be included in the booking status update email sent to the customer.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeclineModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclinePayment}
              disabled={updateBookingStatusMutation.isPending}
            >
              {updateBookingStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Decline Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}