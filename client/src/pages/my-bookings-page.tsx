import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { BookingWithDetails } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Helmet } from "react-helmet";
import ReceiptDownloadButton from "@/components/ReceiptDownloadButton";

export default function MyBookingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const queryClient = useQueryClient();

  // Fetch user's bookings
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch
  } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
    // Lower staleTime to ensure more frequent refreshes
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: true
  });

  // Filter and search bookings
  const filteredBookings = bookings.filter((booking) => {
    // Filter by status
    const statusMatch =
      filter === "all" ||
      (filter === "upcoming" &&
        new Date(booking.flight.departureTime) > new Date() &&
        (booking.status === "Confirmed" || booking.status.includes("Pending"))) ||
      (filter === "past" &&
        new Date(booking.flight.departureTime) < new Date()) ||
      (filter === "pending" && booking.status.includes("Pending")) ||
      (filter === "confirmed" && booking.status === "Confirmed");

    // Search by route, status, or id
    const searchLower = search.toLowerCase();
    const searchMatch =
      search === "" ||
      `${booking.flight.origin.city} ${booking.flight.origin.code}`.toLowerCase().includes(searchLower) ||
      `${booking.flight.destination.city} ${booking.flight.destination.code}`.toLowerCase().includes(searchLower) ||
      booking.status.toLowerCase().includes(searchLower) ||
      `#BK-${booking.id}`.toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "Confirmed") {
      return "bg-green-100 text-green-800";
    } else if (status.includes("Pending")) {
      return "bg-yellow-100 text-yellow-800";
    } else if (status === "Declined") {
      return "bg-red-100 text-red-800";
    } else if (status === "Paid") {
      return "bg-blue-100 text-blue-800";
    } else if (status === "Completed") {
      return "bg-gray-100 text-gray-800";
    } else {
      return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">You need to be logged in to view your bookings</h1>
          <Link href="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Bookings | SkyBooker</title>
        <meta name="description" content="View and manage your flight bookings. Track booking status, payment information, and flight details." />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <label className="text-sm font-medium text-gray-700 mr-2">
                          Filter by:
                        </label>
                        <Select
                          value={filter}
                          onValueChange={setFilter}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Bookings" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Bookings</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="past">Past</SelectItem>
                            <SelectItem value="pending">Pending Payment</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          refetch();
                          toast({
                            title: "Refreshed",
                            description: "Your booking list has been refreshed",
                          });
                        }}
                        className="flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                          <path d="M21 3v5h-5"></path>
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                          <path d="M8 16H3v5"></path>
                        </svg>
                        Refresh
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search bookings..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading bookings...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500">Error loading bookings. Please try again.</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
                    <p className="mt-2 text-gray-500">
                      {search || filter !== "all"
                        ? "No bookings match your current filters. Try different search criteria."
                        : "You haven't made any bookings yet."}
                    </p>
                    {search || filter !== "all" ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                        }}
                        className="mt-4"
                      >
                        Clear Filters
                      </Button>
                    ) : (
                      <Link href="/">
                        <Button className="mt-4">Book a Flight</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Booking ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Route
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Class
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {booking.flight.origin.code} → {booking.flight.destination.code}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.flight.origin.city} to {booking.flight.destination.city}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {format(new Date(booking.flight.departureTime), "MMM d, yyyy")}
                              </div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(booking.flight.departureTime), "h:mm a")}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                booking.travelClass === 'First Class' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : booking.travelClass === 'Business' 
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                              }`}>
                                {booking.travelClass || 'Economy'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(booking.status)}`}>
                                {booking.status}
                              </span>
                              {booking.status === "Declined" && booking.declineReason && (
                                <div className="mt-1 text-xs text-red-600">
                                  Reason: {booking.declineReason}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ${booking.ticketPrice ? 
                                booking.ticketPrice.toFixed(2) : 
                                (booking.travelClass === 'Business' 
                                  ? booking.flight.businessPrice.toFixed(2)
                                  : booking.travelClass === 'First Class'
                                    ? booking.flight.firstClassPrice.toFixed(2)
                                    : booking.flight.economyPrice.toFixed(2)
                                )
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end items-center space-x-2">
                                <Link href={`/payment/${booking.id}`} className="text-primary hover:text-primary/80">
                                  {booking.status.includes("Pending") ? "Complete Payment" : "View"}
                                </Link>
                                
                                {/* Receipt download button */}
                                {(booking.status.toLowerCase() === "paid" || booking.status.toLowerCase() === "completed") && (
                                  <ReceiptDownloadButton 
                                    bookingId={booking.id}
                                    status={booking.status}
                                    receiptPath={booking.receiptPath}
                                    onReceiptGenerated={(path) => {
                                      // Update the local booking object with the new receipt path
                                      queryClient.setQueryData(["/api/bookings"], (oldData: BookingWithDetails[] | undefined) => {
                                        if (!oldData) return [];
                                        return oldData.map(b => 
                                          b.id === booking.id ? { ...b, receiptPath: path } : b
                                        );
                                      });
                                    }}
                                    size="sm"
                                  />
                                )}
                                
                                {booking.status.includes("Pending") && (
                                  <Button 
                                    variant="link" 
                                    className="text-red-600 hover:text-red-900 p-0 h-auto"
                                    onClick={() => {
                                      // Handle booking cancellation here
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredBookings.length > 0 && (
                  <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                        <span className="font-medium">
                          {Math.min(indexOfLastItem, filteredBookings.length)}
                        </span>{" "}
                        of <span className="font-medium">{filteredBookings.length}</span> bookings
                      </div>
                      {totalPages > 1 && (
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <Button
                              variant="outline"
                              size="icon"
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                            >
                              <span className="sr-only">Previous</span>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            {Array.from({ length: totalPages }).map((_, i) => (
                              <Button
                                key={i}
                                variant={currentPage === i + 1 ? "default" : "outline"}
                                size="icon"
                                className={`relative inline-flex items-center px-4 py-2 border ${
                                  currentPage === i + 1
                                    ? "bg-primary-50 text-primary border-primary"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                                onClick={() => handlePageChange(i + 1)}
                              >
                                {i + 1}
                              </Button>
                            ))}
                            
                            <Button
                              variant="outline"
                              size="icon"
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                            >
                              <span className="sr-only">Next</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </nav>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
