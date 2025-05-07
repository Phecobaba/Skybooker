import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Location } from "@shared/schema";

const searchSchema = z.object({
  tripType: z.enum(["roundTrip", "oneWay"]),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required").refine(
    (val: string, ctx: { data: { origin: string } }) => val !== ctx.data.origin,
    "Origin and destination cannot be the same"
  ),
  departureDate: z.date({
    required_error: "Departure date is required",
  }),
  returnDate: z.date().optional(),
});

type SearchValues = z.infer<typeof searchSchema>;

export default function FlightSearchForm() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [tripType, setTripType] = useState<"roundTrip" | "oneWay">("roundTrip");

  // Parse URL parameters if they exist
  useEffect(() => {
    const params = new URLSearchParams(search);
    const origin = params.get("origin");
    const destination = params.get("destination");
    const departureDateParam = params.get("departureDate");
    const returnDateParam = params.get("returnDate");
    const tripTypeParam = params.get("tripType") as "roundTrip" | "oneWay";

    if (origin || destination || departureDateParam || returnDateParam) {
      const defaultValues: Partial<SearchValues> = {};
      if (origin) defaultValues.origin = origin;
      if (destination) defaultValues.destination = destination;
      if (departureDateParam) defaultValues.departureDate = new Date(departureDateParam);
      if (returnDateParam) defaultValues.returnDate = new Date(returnDateParam);
      if (tripTypeParam) {
        setTripType(tripTypeParam);
        defaultValues.tripType = tripTypeParam;
      }
      form.reset(defaultValues);
    }
  }, [search]);

  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      tripType: "roundTrip",
      origin: "",
      destination: "",
      departureDate: undefined,
      returnDate: undefined,
    },
  });

  // Fetch locations for origin and destination dropdowns
  const { data: locations = [], isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  // Handle form submission
  const onSubmit = (values: SearchValues) => {
    const searchParams = new URLSearchParams();
    searchParams.set("origin", values.origin);
    searchParams.set("destination", values.destination);
    searchParams.set("departureDate", format(values.departureDate, "yyyy-MM-dd"));
    searchParams.set("tripType", values.tripType);
    
    if (values.returnDate) {
      searchParams.set("returnDate", format(values.returnDate, "yyyy-MM-dd"));
    }
    
    navigate(`/search?${searchParams.toString()}`);
  };

  const handleTripTypeChange = (type: "roundTrip" | "oneWay") => {
    setTripType(type);
    form.setValue("tripType", type);
    
    // Clear return date if switching to one way
    if (type === "oneWay") {
      form.setValue("returnDate", undefined);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4 border-b">
          <button
            className={cn(
              "mr-6 py-3 font-medium",
              tripType === "roundTrip"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => handleTripTypeChange("roundTrip")}
            type="button"
          >
            Round Trip
          </button>
          <button
            className={cn(
              "mr-6 py-3 font-medium",
              tripType === "oneWay"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => handleTripTypeChange("oneWay")}
            type="button"
          >
            One Way
          </button>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>From</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger disabled={locationsLoading}>
                        <SelectValue placeholder="Select Origin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem
                          key={location.code}
                          value={location.code}
                        >
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
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>To</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger disabled={locationsLoading}>
                        <SelectValue placeholder="Select Destination" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem
                          key={location.code}
                          value={location.code}
                        >
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
              control={form.control}
              name="departureDate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Departure</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="returnDate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Return</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={tripType === "oneWay"}
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
                        disabled={(date) => {
                          const departureDate = form.getValues("departureDate");
                          return !departureDate || date < departureDate;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 lg:col-span-4 flex justify-center mt-4">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-6 px-8 rounded-lg shadow-md transition flex items-center"
                disabled={form.formState.isSubmitting}
              >
                <SearchIcon className="mr-2 h-5 w-5" /> Search Flights
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
