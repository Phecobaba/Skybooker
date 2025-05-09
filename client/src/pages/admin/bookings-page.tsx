import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Search, Eye, Check, X, Filter, CalendarIcon, Trash2 } from "lucide-react";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { BookingWithDetails, Location } from "@shared/schema";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type FilterOptions = {
  status: string;
  dateRange: "all" | "today" | "thisWeek" | "thisMonth" | "custom";
  startDate: Date | null;
  endDate: Date | null;
  originCode: string;
  destinationCode: string;
};

export default function AdminBookingsPage() {
  const { toast } = useToast();
  const [searchText, setSearchText] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: "all",
    dateRange: "all",
    startDate: null,
    endDate: null,
    originCode: "all_origins",
    destinationCode: "all_destinations",
  });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all bookings
  const {
    data: bookings = [],
    isLoading,
    error,
  } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/bookings"],
  });

  // Fetch locations for filter dropdown
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Get selected booking for detail view
  const selectedBooking = selectedBookingId
    ? bookings.find((booking) => booking.id === selectedBookingId)
    : null;

  // Update booking status mutation
  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => {
      const res = await apiRequest("PUT", `/api/admin/bookings/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking status updated",
        description: "The booking status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating booking status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/bookings/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking deleted",
        description: "The booking has been permanently deleted",
      });
      setIsDeleteDialogOpen(false);
      setSelectedBookingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Bulk delete bookings mutation
  const bulkDeleteBookingsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiRequest("DELETE", `/api/admin/bookings/bulk`, { ids });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Bookings deleted",
        description: `Successfully deleted ${selectedBookings.length} bookings`,
      });
      setIsBulkDeleteDialogOpen(false);
      setSelectedBookings([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting bookings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter bookings based on search and filter options
  const filteredBookings = bookings.filter((booking) => {
    // Search filter
    if (searchText) {
      const search = searchText.toLowerCase();
      const searchMatch =
        `#BK-${booking.id}`.toLowerCase().includes(search) ||
        booking.passengerFirstName.toLowerCase().includes(search) ||
        booking.passengerLastName.toLowerCase().includes(search) ||
        booking.passengerEmail.toLowerCase().includes(search) ||
        booking.flight.origin.code.toLowerCase().includes(search) ||
        booking.flight.destination.code.toLowerCase().includes(search) ||
        booking.flight.origin.city.toLowerCase().includes(search) ||
        booking.flight.destination.city.toLowerCase().includes(search);

      if (!searchMatch) return false;
    }

    // Status filter
    if (filterOptions.status !== "all" && booking.status !== filterOptions.status) {
      return false;
    }

    // Origin filter
    if (
      filterOptions.originCode &&
      filterOptions.originCode !== "all_origins" &&
      booking.flight.origin.code !== filterOptions.originCode
    ) {
      return false;
    }

    // Destination filter
    if (
      filterOptions.destinationCode &&
      filterOptions.destinationCode !== "all_destinations" &&
      booking.flight.destination.code !== filterOptions.destinationCode
    ) {
      return false;
    }

    // Date range filter
    const departureDate = new Date(booking.flight.departureTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterOptions.dateRange === "today") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return departureDate >= today && departureDate < tomorrow;
    } else if (filterOptions.dateRange === "thisWeek") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      return departureDate >= startOfWeek && departureDate < endOfWeek;
    } else if (filterOptions.dateRange === "thisMonth") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return departureDate >= startOfMonth && departureDate <= endOfMonth;
    } else if (filterOptions.dateRange === "custom") {
      if (filterOptions.startDate) {
        const startDate = new Date(filterOptions.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (departureDate < startDate) return false;
      }
      if (filterOptions.endDate) {
        const endDate = new Date(filterOptions.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (departureDate > endDate) return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStatusChange = (bookingId: number, newStatus: string) => {
    updateBookingStatusMutation.mutate({
      id: bookingId,
      status: newStatus,
    });
  };

  const resetFilters = () => {
    setFilterOptions({
      status: "all",
      dateRange: "all",
      startDate: null,
      endDate: null,
      originCode: "all_origins",
      destinationCode: "all_destinations",
    });
    setSearchText("");
    setCurrentPage(1);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Declined":
        return "bg-red-100 text-red-800";
      case "Completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const toggleBookingSelection = (bookingId: number) => {
    setSelectedBookings(prev => {
      if (prev.includes(bookingId)) {
        return prev.filter(id => id !== bookingId);
      } else {
        return [...prev, bookingId];
      }
    });
  };
  
  const toggleAllBookings = () => {
    if (selectedBookings.length === currentBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(currentBookings.map(booking => booking.id));
    }
  };
  
  const confirmDeleteBooking = (id: number) => {
    setSelectedBookingId(id);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmBulkDelete = () => {
    if (selectedBookings.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    } else {
      toast({
        title: "No bookings selected",
        description: "Please select at least one booking to delete",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Booking Management | SkyBooker Admin</title>
        <meta
          name="description"
          content="Manage flight bookings - view details, update statuses, and review payment information"
        />
      </Helmet>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <AdminHeader 
                  title="Booking Management"
                  description="View and manage flight bookings"
                  showBackButton={true}
                  backButtonUrl="/admin"
                />
                
                <div className="flex justify-end mb-6 space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsFilterModalOpen(true)}
                    className="flex items-center"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {(filterOptions.status !== "all" ||
                      filterOptions.dateRange !== "all" ||
                      filterOptions.originCode !== "all_origins" ||
                      filterOptions.destinationCode !== "all_destinations") && (
                      <span className="ml-1 w-2 h-2 rounded-full bg-primary"></span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="flex items-center"
                    disabled={
                      filterOptions.status === "all" &&
                      filterOptions.dateRange === "all" &&
                      filterOptions.originCode === "all_origins" &&
                      filterOptions.destinationCode === "all_destinations" &&
                      !searchText
                    }
                  >
                    Reset
                  </Button>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by booking ID, passenger name, email, or locations..."
                      className="pl-10"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading bookings...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500">
                      Error loading bookings. Please try again.
                    </p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">
                      No bookings found
                    </h3>
                    <p className="mt-2 text-gray-500">
                      {searchText || filterOptions.status !== "all" || filterOptions.dateRange !== "all" || 
                       filterOptions.originCode !== "all_origins" || filterOptions.destinationCode !== "all_destinations"
                        ? "No bookings match your search criteria."
                        : "There are no bookings in the system yet."}
                    </p>
                    {(searchText || filterOptions.status !== "all" || filterOptions.dateRange !== "all" || 
                      filterOptions.originCode !== "all_origins" || filterOptions.destinationCode !== "all_destinations") && (
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="mt-4"
                      >
                        Clear Filters
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
                              Date
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Payment
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
                                <div className="text-xs text-gray-500">
                                  {booking.passengerPhone}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {booking.flight.origin.code} → {booking.flight.destination.code}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {booking.flight.origin.city} to {booking.flight.destination.city}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(
                                    new Date(booking.flight.departureTime),
                                    "MMM d, yyyy"
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {format(
                                    new Date(booking.flight.departureTime),
                                    "h:mm a"
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                                    booking.status
                                  )}`}
                                >
                                  {booking.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  ${booking.ticketPrice ? 
                                    booking.ticketPrice.toFixed(2) : 
                                    (booking.travelClass === 'Business' 
                                      ? booking.flight.businessPrice.toFixed(2)
                                      : booking.travelClass === 'First Class'
                                        ? booking.flight.firstClassPrice.toFixed(2)
                                        : booking.flight.economyPrice.toFixed(2)
                                    )
                                  }
                                </div>
                                <div className="text-xs text-gray-600">
                                  {booking.travelClass || 'Economy'} Class
                                </div>
                                <div className="text-xs text-gray-500">
                                  {booking.paymentReference
                                    ? `Ref: ${booking.paymentReference.substring(0, 10)}...`
                                    : "No reference"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center"
                                    onClick={() => {
                                      setSelectedBookingId(booking.id);
                                      setIsDetailModalOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" /> View
                                  </Button>
                                  {booking.status === "Pending" && (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="flex items-center bg-green-600 hover:bg-green-700"
                                        onClick={() =>
                                          handleStatusChange(booking.id, "Confirmed")
                                        }
                                      >
                                        <Check className="h-4 w-4 mr-1" /> Approve
                                      </Button>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="flex items-center bg-red-600 hover:bg-red-700"
                                        onClick={() =>
                                          handleStatusChange(booking.id, "Declined")
                                        }
                                      >
                                        <X className="h-4 w-4 mr-1" /> Decline
                                      </Button>
                                    </>
                                  )}
                                </div>
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
                              handlePageChange(
                                Math.min(totalPages, currentPage + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing{" "}
                              <span className="font-medium">
                                {indexOfFirstItem + 1}
                              </span>{" "}
                              to{" "}
                              <span className="font-medium">
                                {Math.min(
                                  indexOfLastItem,
                                  filteredBookings.length
                                )}
                              </span>{" "}
                              of{" "}
                              <span className="font-medium">
                                {filteredBookings.length}
                              </span>{" "}
                              bookings
                            </p>
                          </div>
                          <div>
                            <nav
                              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                              aria-label="Pagination"
                            >
                              <Button
                                variant="outline"
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                onClick={() =>
                                  handlePageChange(Math.max(1, currentPage - 1))
                                }
                                disabled={currentPage === 1}
                              >
                                <span className="sr-only">Previous</span>
                                <svg
                                  className="h-5 w-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </Button>

                              {Array.from({ length: totalPages }).map((_, i) => (
                                <Button
                                  key={i}
                                  variant={
                                    currentPage === i + 1 ? "default" : "outline"
                                  }
                                  className={cn(
                                    "relative inline-flex items-center px-4 py-2 border text-sm font-medium",
                                    currentPage === i + 1
                                      ? "bg-primary-50 text-primary border-primary"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                  )}
                                  onClick={() => handlePageChange(i + 1)}
                                >
                                  {i + 1}
                                </Button>
                              ))}

                              <Button
                                variant="outline"
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                onClick={() =>
                                  handlePageChange(
                                    Math.min(totalPages, currentPage + 1)
                                  )
                                }
                                disabled={currentPage === totalPages}
                              >
                                <span className="sr-only">Next</span>
                                <svg
                                  className="h-5 w-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                    clipRule="evenodd"
                                  />
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

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Booking Details: #{selectedBooking.id}
              </DialogTitle>
              <DialogDescription>
                Full information about this booking
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Passenger Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <p className="text-sm font-medium">
                      {selectedBooking.passengerFirstName}{" "}
                      {selectedBooking.passengerLastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="text-sm">{selectedBooking.passengerEmail}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Phone:</span>
                    <p className="text-sm">{selectedBooking.passengerPhone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">User ID:</span>
                    <p className="text-sm">{selectedBooking.userId}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Booking Date:
                    </span>
                    <p className="text-sm">
                      {format(
                        new Date(selectedBooking.bookingDate),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">
                  Payment Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        selectedBooking.status
                      )}`}
                    >
                      {selectedBooking.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Payment Reference:
                    </span>
                    <p className="text-sm">
                      {selectedBooking.paymentReference || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Payment Proof:
                    </span>
                    {selectedBooking.paymentProof ? (
                      <div className="mt-2">
                        <a
                          href={selectedBooking.paymentProof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-40 relative border rounded"
                        >
                          <img
                            src={selectedBooking.paymentProof}
                            alt="Payment Proof"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white text-sm font-medium">
                              Click to view
                            </span>
                          </div>
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No proof uploaded</p>
                    )}
                  </div>
                </div>

                {selectedBooking.status === "Pending" && (
                  <div className="mt-6 space-y-3">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleStatusChange(selectedBooking.id, "Confirmed")
                      }
                    >
                      <Check className="mr-2 h-4 w-4" /> Approve Booking
                    </Button>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() =>
                        handleStatusChange(selectedBooking.id, "Declined")
                      }
                    >
                      <X className="mr-2 h-4 w-4" /> Decline Booking
                    </Button>
                  </div>
                )}
                
                {selectedBooking.status === "Pending Payment" && (
                  <div className="mt-6 space-y-3">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleStatusChange(selectedBooking.id, "Paid")
                      }
                    >
                      <Check className="mr-2 h-4 w-4" /> Approve Payment
                    </Button>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={() =>
                        handleStatusChange(selectedBooking.id, "Declined")
                      }
                    >
                      <X className="mr-2 h-4 w-4" /> Decline Payment
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Flight Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500">Flight ID</div>
                      <div className="text-sm font-medium">
                        FL-{selectedBooking.flightId.toString().padStart(3, '0')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Price</div>
                      <div className="text-sm font-medium">
                        ${selectedBooking.ticketPrice ? 
                          selectedBooking.ticketPrice.toFixed(2) : 
                          (selectedBooking.travelClass === 'Business' 
                            ? selectedBooking.flight.businessPrice.toFixed(2)
                            : selectedBooking.travelClass === 'First Class'
                              ? selectedBooking.flight.firstClassPrice.toFixed(2)
                              : selectedBooking.flight.economyPrice.toFixed(2)
                          )
                        }
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {selectedBooking.travelClass || 'Economy'} Class
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xl font-bold">
                          {format(
                            new Date(selectedBooking.flight.departureTime),
                            "h:mm a"
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(
                            new Date(selectedBooking.flight.departureTime),
                            "MMM d, yyyy"
                          )}
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {selectedBooking.flight.origin.code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedBooking.flight.origin.city},{" "}
                          {selectedBooking.flight.origin.country}
                        </div>
                      </div>

                      <div className="flex flex-col items-center px-4">
                        <div className="text-xs text-gray-500 text-center">
                          {format(
                            new Date(selectedBooking.flight.arrivalTime).getTime() -
                              new Date(selectedBooking.flight.departureTime).getTime(),
                            "h'h' mm'm'"
                          )}
                        </div>
                        <div className="relative w-24 my-2">
                          <div className="border-t border-gray-300 my-3"></div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div className="text-xs text-gray-500">Direct Flight</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {format(
                            new Date(selectedBooking.flight.arrivalTime),
                            "h:mm a"
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(
                            new Date(selectedBooking.flight.arrivalTime),
                            "MMM d, yyyy"
                          )}
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {selectedBooking.flight.destination.code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {selectedBooking.flight.destination.city},{" "}
                          {selectedBooking.flight.destination.country}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-xs text-gray-500">Departure Terminal</div>
                        <div className="text-sm">
                          {selectedBooking.flight.origin.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Arrival Terminal</div>
                        <div className="text-sm">
                          {selectedBooking.flight.destination.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-xs text-gray-500 mb-1">Passengers</div>
                    <div className="text-sm">1 Adult</div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-xs text-gray-500 mb-1">
                      Flight Capacity
                    </div>
                    <div className="text-sm">
                      {selectedBooking.travelClass === 'Business' 
                        ? `${selectedBooking.flight.businessCapacity} Business Class seats`
                        : selectedBooking.travelClass === 'First Class'
                          ? `${selectedBooking.flight.firstClassCapacity} First Class seats`
                          : `${selectedBooking.flight.economyCapacity} Economy Class seats`
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total capacity: {selectedBooking.flight.economyCapacity + selectedBooking.flight.businessCapacity + selectedBooking.flight.firstClassCapacity} seats
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Filter Bookings</DialogTitle>
            <DialogDescription>
              Apply filters to narrow down the booking list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Booking Status</label>
              <Select
                value={filterOptions.status}
                onValueChange={(value) =>
                  setFilterOptions({ ...filterOptions, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Pending Payment">Pending Payment</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Declined">Declined</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Travel Date</label>
              <Select
                value={filterOptions.dateRange}
                onValueChange={(value) =>
                  setFilterOptions({
                    ...filterOptions,
                    dateRange: value as FilterOptions["dateRange"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterOptions.dateRange === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filterOptions.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterOptions.startDate ? (
                          format(filterOptions.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterOptions.startDate || undefined}
                        onSelect={(date) =>
                          setFilterOptions({
                            ...filterOptions,
                            startDate: date as Date | null,
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filterOptions.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterOptions.endDate ? (
                          format(filterOptions.endDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filterOptions.endDate || undefined}
                        onSelect={(date) =>
                          setFilterOptions({
                            ...filterOptions,
                            endDate: date as Date | null,
                          })
                        }
                        initialFocus
                        disabled={(date) =>
                          filterOptions.startDate
                            ? date < filterOptions.startDate
                            : false
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Origin</label>
              <Select
                value={filterOptions.originCode}
                onValueChange={(value) =>
                  setFilterOptions({ ...filterOptions, originCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_origins">All Origins</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.code}>
                      {location.city} ({location.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Select
                value={filterOptions.destinationCode}
                onValueChange={(value) =>
                  setFilterOptions({ ...filterOptions, destinationCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_destinations">All Destinations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.code}>
                      {location.city} ({location.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCurrentPage(1);
                setIsFilterModalOpen(false);
              }}
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
