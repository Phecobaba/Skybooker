import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import AdminSidebar from "@/components/admin/Sidebar";
import StatsCard from "@/components/admin/StatsCard";
import { 
  Search, 
  UserCircle, 
  ChevronLeft, 
  ChevronRight, 
  PlaneTakeoff, 
  CalendarCheck, 
  Clock, 
  Users 
} from "lucide-react";
import { 
  BookingWithDetails, 
  FlightWithLocations 
} from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AdminDashboardPage() {
  // Fetch all bookings
  const { data: bookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/bookings"],
  });

  // Fetch all flights
  const { data: flights = [] } = useQuery<FlightWithLocations[]>({
    queryKey: ["/api/admin/flights"],
  });

  // Get pending payments (both "Pending" and "Pending Payment" statuses)
  const pendingBookings = bookings.filter(booking => 
    booking.status === "Pending" || booking.status === "Pending Payment");
  
  // Get recent bookings (latest 5)
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime())
    .slice(0, 5);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | SkyBooker</title>
        <meta name="description" content="Admin dashboard for managing flights, bookings, and users" />
      </Helmet>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex">
                <div className="w-full flex md:ml-0">
                  <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                    <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 ml-2" />
                    </div>
                    <Input
                      id="search-field"
                      className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-transparent sm:text-sm"
                      placeholder="Search"
                      type="search"
                    />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center md:ml-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <span className="sr-only">View notifications</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </Button>
                <div className="ml-3 relative">
                  <div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <span className="sr-only">Open user menu</span>
                      <UserCircle className="h-8 w-8 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-100">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {/* Dashboard Content */}
                <div className="py-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatsCard
                      title="Total Flights"
                      value={flights.length}
                      icon={<PlaneTakeoff className="text-2xl" />}
                      linkText="View all"
                      linkUrl="/admin/flights"
                      color="primary"
                    />

                    <StatsCard
                      title="Bookings This Month"
                      value={bookings.filter(b => {
                        const bookingDate = new Date(b.bookingDate);
                        const now = new Date();
                        return (
                          bookingDate.getMonth() === now.getMonth() &&
                          bookingDate.getFullYear() === now.getFullYear()
                        );
                      }).length}
                      icon={<CalendarCheck className="text-2xl" />}
                      linkText="View all"
                      linkUrl="/admin/bookings"
                      color="green"
                    />

                    <StatsCard
                      title="Pending Payments"
                      value={pendingBookings.length}
                      icon={<Clock className="text-2xl" />}
                      linkText="Review"
                      linkUrl="/admin/payments"
                      color="yellow"
                    />

                    <StatsCard
                      title="Total Users"
                      value={bookings
                        .map(b => b.userId)
                        .filter((v, i, a) => a.indexOf(v) === i).length}
                      icon={<Users className="text-2xl" />}
                      linkText="View all"
                      linkUrl="/admin/users"
                      color="red"
                    />
                  </div>

                  {/* Recent Bookings Table */}
                  <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Recent Bookings
                      </h3>
                      <Link href="/admin/bookings">
                        <a className="text-sm font-medium text-primary hover:text-primary/80">
                          View all
                        </a>
                      </Link>
                    </div>
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
                              User
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
                              Amount
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
                          {recentBookings.map((booking) => (
                            <tr key={booking.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  #BK-{booking.id}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {booking.passengerFirstName} {booking.passengerLastName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {booking.passengerEmail}
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
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={
                                    booking.status === "Confirmed"
                                      ? "success"
                                      : booking.status === "Pending"
                                      ? "warning"
                                      : booking.status === "Completed"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {booking.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${booking.flight.price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={`/admin/bookings?id=${booking.id}`}>
                                  <a className="text-primary hover:text-primary/80 mr-3">
                                    View
                                  </a>
                                </Link>
                                {booking.status !== "Completed" && (
                                  <Link href={`/admin/bookings?id=${booking.id}&action=cancel`}>
                                    <a className="text-red-600 hover:text-red-900">
                                      Cancel
                                    </a>
                                  </Link>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Flight Management Preview */}
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Flight Management
                      </h3>
                      <Link href="/admin/flights">
                        <Button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add New Flight
                        </Button>
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Flight ID
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Origin
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Destination
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
                              Time
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Price
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
                          {flights.slice(0, 3).map((flight) => (
                            <tr key={flight.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  FL-{flight.id.toString().padStart(3, '0')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {flight.origin.code}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {flight.origin.city}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {flight.destination.code}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {flight.destination.city}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(new Date(flight.departureTime), "MMM d, yyyy")}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(new Date(flight.departureTime), "h:mm a")}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${flight.price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={`/admin/flights?id=${flight.id}&action=edit`}>
                                  <a className="text-primary hover:text-primary/80 mr-3">
                                    Edit
                                  </a>
                                </Link>
                                <Link href={`/admin/flights?id=${flight.id}&action=delete`}>
                                  <a className="text-red-600 hover:text-red-900">
                                    Delete
                                  </a>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-medium">1</span> to{" "}
                          <span className="font-medium">3</span> of{" "}
                          <span className="font-medium">{flights.length}</span> flights
                        </div>
                        <div>
                          <nav
                            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                            aria-label="Pagination"
                          >
                            <a
                              href="#"
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                            >
                              <span className="sr-only">Previous</span>
                              <ChevronLeft className="h-5 w-5" />
                            </a>
                            <a
                              href="#"
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-primary-50 text-sm font-medium text-primary hover:bg-primary-100"
                            >
                              1
                            </a>
                            <a
                              href="#"
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              2
                            </a>
                            <a
                              href="#"
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              3
                            </a>
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                            <a
                              href="#"
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {Math.ceil(flights.length / 10)}
                            </a>
                            <a
                              href="#"
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                            >
                              <span className="sr-only">Next</span>
                              <ChevronRight className="h-5 w-5" />
                            </a>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
