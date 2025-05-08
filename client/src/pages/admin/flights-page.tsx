import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import { useSearch, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { 
  FlightWithLocations, 
  Location, 
  insertFlightSchema 
} from "@shared/schema";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  CalendarIcon, 
  Clock 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extended schema for the form with time fields
const flightFormSchema = z.object({
  originId: z.number(),
  destinationId: z.number(),
  departureDate: z.date(),
  departureTime: z.string(),
  arrivalDate: z.date(),
  arrivalTime: z.string(),
  price: z.string().refine(value => !isNaN(parseFloat(value)) && parseFloat(value) > 0, {
    message: "Price must be a positive number",
  }),
  capacity: z.string().refine(value => !isNaN(parseInt(value)) && parseInt(value) > 0, {
    message: "Capacity must be a positive number",
  }),
});

type FlightFormValues = z.infer<typeof flightFormSchema>;

export default function AdminFlightsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const { toast } = useToast();
  
  const [searchText, setSearchText] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Handle URL params for edit/delete actions
  const idParam = searchParams.get("id");
  const actionParam = searchParams.get("action");
  
  // Check URL params on component load using useEffect to prevent infinite re-renders
  useEffect(() => {
    if (idParam && actionParam) {
      const id = parseInt(idParam);
      if (!isNaN(id)) {
        if (actionParam === "edit" && !isEditDialogOpen) {
          setSelectedFlightId(id);
          setIsEditDialogOpen(true);
        } else if (actionParam === "delete" && !isDeleteDialogOpen) {
          setSelectedFlightId(id);
          setIsDeleteDialogOpen(true);
        }
        
        // Clear URL params after handling
        navigate("/admin/flights");
      }
    }
  }, [idParam, actionParam, isEditDialogOpen, isDeleteDialogOpen, navigate]);

  // Fetch flights
  const { 
    data: flights = [], 
    isLoading: flightsLoading, 
    error: flightsError 
  } = useQuery<FlightWithLocations[]>({
    queryKey: ["/api/admin/flights"],
  });

  // Fetch locations for the form
  const { 
    data: locations = [], 
    isLoading: locationsLoading 
  } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Get selected flight for edit
  const selectedFlight = selectedFlightId 
    ? flights.find(flight => flight.id === selectedFlightId) 
    : null;

  // Filter flights based on search
  const filteredFlights = flights.filter(flight => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      flight.origin.name.toLowerCase().includes(search) ||
      flight.origin.code.toLowerCase().includes(search) ||
      flight.destination.name.toLowerCase().includes(search) ||
      flight.destination.code.toLowerCase().includes(search) ||
      format(new Date(flight.departureTime), "MMM d, yyyy").toLowerCase().includes(search)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredFlights.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFlights = filteredFlights.slice(indexOfFirstItem, indexOfLastItem);

  // Form setup for adding a flight
  const addForm = useForm<FlightFormValues>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: {
      originId: 0,
      destinationId: 0,
      departureDate: new Date(),
      departureTime: "10:00",
      arrivalDate: new Date(),
      arrivalTime: "12:00",
      price: "0",
      capacity: "200",
    },
  });

  // Form setup for editing a flight
  const editForm = useForm<FlightFormValues>({
    resolver: zodResolver(flightFormSchema),
    defaultValues: {
      originId: selectedFlight?.originId || 0,
      destinationId: selectedFlight?.destinationId || 0,
      departureDate: selectedFlight ? new Date(selectedFlight.departureTime) : new Date(),
      departureTime: selectedFlight ? format(new Date(selectedFlight.departureTime), "HH:mm") : "10:00",
      arrivalDate: selectedFlight ? new Date(selectedFlight.arrivalTime) : new Date(),
      arrivalTime: selectedFlight ? format(new Date(selectedFlight.arrivalTime), "HH:mm") : "12:00",
      price: selectedFlight ? selectedFlight.price.toString() : "0",
      capacity: selectedFlight ? selectedFlight.capacity.toString() : "200",
    },
  });

  // Update edit form when selected flight changes using useEffect
  useEffect(() => {
    if (selectedFlight && isEditDialogOpen) {
      editForm.reset({
        originId: selectedFlight.originId,
        destinationId: selectedFlight.destinationId,
        departureDate: new Date(selectedFlight.departureTime),
        departureTime: format(new Date(selectedFlight.departureTime), "HH:mm"),
        arrivalDate: new Date(selectedFlight.arrivalTime),
        arrivalTime: format(new Date(selectedFlight.arrivalTime), "HH:mm"),
        price: selectedFlight.price.toString(),
        capacity: selectedFlight.capacity.toString(),
      });
    }
  }, [selectedFlight, isEditDialogOpen, editForm]);

  // Create flight mutation
  const createFlightMutation = useMutation({
    mutationFn: async (flightData: any) => {
      const res = await apiRequest("POST", "/api/admin/flights", flightData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flights"] });
      toast({
        title: "Flight created",
        description: "The flight has been created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating flight",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update flight mutation
  const updateFlightMutation = useMutation({
    mutationFn: async ({ id, flightData }: { id: number; flightData: any }) => {
      const res = await apiRequest("PUT", `/api/admin/flights/${id}`, flightData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update flight");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flights"] });
      toast({
        title: "Flight updated",
        description: "The flight has been updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedFlightId(null);
    },
    onError: (error: Error) => {
      console.error("Update flight error:", error);
      toast({
        title: "Error updating flight",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete flight mutation
  const deleteFlightMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/flights/${id}`);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flights"] });
      toast({
        title: "Flight deleted",
        description: "The flight has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedFlightId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting flight",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onAddSubmit = (values: FlightFormValues) => {
    // Combine date and time
    const departureDateTime = new Date(values.departureDate);
    const [departureHours, departureMinutes] = values.departureTime.split(':').map(Number);
    departureDateTime.setHours(departureHours, departureMinutes);
    
    const arrivalDateTime = new Date(values.arrivalDate);
    const [arrivalHours, arrivalMinutes] = values.arrivalTime.split(':').map(Number);
    arrivalDateTime.setHours(arrivalHours, arrivalMinutes);
    
    createFlightMutation.mutate({
      originId: values.originId,
      destinationId: values.destinationId,
      departureTime: departureDateTime.toISOString(),
      arrivalTime: arrivalDateTime.toISOString(),
      price: parseFloat(values.price),
      capacity: parseInt(values.capacity),
    });
  };

  const onEditSubmit = (values: FlightFormValues) => {
    if (!selectedFlightId) return;
    
    // Combine date and time
    const departureDateTime = new Date(values.departureDate);
    const [departureHours, departureMinutes] = values.departureTime.split(':').map(Number);
    departureDateTime.setHours(departureHours, departureMinutes);
    
    const arrivalDateTime = new Date(values.arrivalDate);
    const [arrivalHours, arrivalMinutes] = values.arrivalTime.split(':').map(Number);
    arrivalDateTime.setHours(arrivalHours, arrivalMinutes);
    
    updateFlightMutation.mutate({
      id: selectedFlightId,
      flightData: {
        originId: values.originId,
        destinationId: values.destinationId,
        departureTime: departureDateTime.toISOString(),
        arrivalTime: arrivalDateTime.toISOString(),
        price: parseFloat(values.price),
        capacity: parseInt(values.capacity),
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (selectedFlightId) {
      deleteFlightMutation.mutate(selectedFlightId);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <Helmet>
        <title>Flight Management | SkyBooker Admin</title>
        <meta name="description" content="Manage flights - add, edit, and delete flights" />
      </Helmet>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <AdminHeader 
                  title="Flight Management"
                  description="Add, edit, or remove flights from the system"
                />
                
                <div className="flex justify-end mb-6">
                  <Button 
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add New Flight
                  </Button>
                </div>
                
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search flights by origin, destination, or date..."
                      className="pl-10"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                </div>

                {flightsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading flights...</span>
                  </div>
                ) : flightsError ? (
                  <div className="text-center py-12">
                    <p className="text-red-500">Error loading flights. Please try again.</p>
                  </div>
                ) : filteredFlights.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">No flights found</h3>
                    <p className="mt-2 text-gray-500">
                      {searchText
                        ? "No flights match your search criteria."
                        : "There are no flights in the system yet."}
                    </p>
                    {searchText ? (
                      <Button
                        variant="outline"
                        onClick={() => setSearchText("")}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="mt-4"
                      >
                        Add Your First Flight
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Flight ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Origin
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Destination
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Departure
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Arrival
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Capacity
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentFlights.map((flight) => (
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
                                  {flight.origin.city}, {flight.origin.country}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {flight.destination.code}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {flight.destination.city}, {flight.destination.country}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(new Date(flight.departureTime), "MMM d, yyyy")}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(flight.departureTime), "h:mm a")}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {format(new Date(flight.arrivalTime), "MMM d, yyyy")}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(flight.arrivalTime), "h:mm a")}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${flight.price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {flight.capacity} seats
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => {
                                    setSelectedFlightId(flight.id);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-900 ml-2"
                                  onClick={() => {
                                    setSelectedFlightId(flight.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
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
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
                                {Math.min(indexOfLastItem, filteredFlights.length)}
                              </span>{" "}
                              of <span className="font-medium">{filteredFlights.length}</span> flights
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

      {/* Add Flight Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Flight</DialogTitle>
            <DialogDescription>
              Enter the details for the new flight.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="originId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                        disabled={locationsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select origin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.city} ({location.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="destinationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                        disabled={locationsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.city} ({location.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="departureDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Departure Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time</FormLabel>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 opacity-50" />
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="arrivalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Arrival Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Time</FormLabel>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 opacity-50" />
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (seats)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createFlightMutation.isPending}
                >
                  {createFlightMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Flight"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Flight Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Flight</DialogTitle>
            <DialogDescription>
              Update the details for flight FL-{selectedFlightId?.toString().padStart(3, '0')}.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="originId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                        disabled={locationsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select origin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.city} ({location.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="destinationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                        disabled={locationsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.city} ({location.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="departureDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Departure Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time</FormLabel>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 opacity-50" />
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="arrivalDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Arrival Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Time</FormLabel>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 opacity-50" />
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (seats)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedFlightId(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateFlightMutation.isPending}
                >
                  {updateFlightMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Flight"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Flight Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this flight?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the flight and any associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedFlightId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteFlightMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
