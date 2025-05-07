import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FlightCard from "@/components/FlightCard";
import { FlightWithLocations } from "@shared/schema";
import { Helmet } from "react-helmet";

export default function SearchResultsPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const departureDate = searchParams.get("departureDate");
  const returnDate = searchParams.get("returnDate");
  const tripType = searchParams.get("tripType");
  
  const [formattedOrigin, setFormattedOrigin] = useState<string>("");
  const [formattedDestination, setFormattedDestination] = useState<string>("");

  // Fetch flights based on search criteria
  const { data: flights = [], isLoading, error } = useQuery<FlightWithLocations[]>({
    queryKey: [
      `/api/flights/search?origin=${origin}&destination=${destination}&departureDate=${departureDate}`,
    ],
    enabled: !!origin && !!destination && !!departureDate,
  });

  // Fetch locations to display full names instead of codes
  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
  });

  useEffect(() => {
    if (locations.length > 0) {
      const originLocation = locations.find(loc => loc.code === origin);
      const destinationLocation = locations.find(loc => loc.code === destination);
      
      if (originLocation) {
        setFormattedOrigin(`${originLocation.city} (${originLocation.code})`);
      }
      
      if (destinationLocation) {
        setFormattedDestination(`${destinationLocation.city} (${destinationLocation.code})`);
      }
    }
  }, [locations, origin, destination]);

  // Function to find the cheapest flight
  const getCheapestFlightId = () => {
    if (!flights.length) return null;
    return flights.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    ).id;
  };

  const cheapestFlightId = getCheapestFlightId();
  
  // Format dates for display
  const formattedDepartureDate = departureDate 
    ? format(new Date(departureDate), "MMM d, yyyy") 
    : "";
  
  const formattedReturnDate = returnDate 
    ? format(new Date(returnDate), "MMM d, yyyy") 
    : "";
  
  const dateDisplay = returnDate 
    ? `${formattedDepartureDate} - ${formattedReturnDate}` 
    : formattedDepartureDate;

  return (
    <>
      <Helmet>
        <title>Flight Search Results | SkyBooker</title>
        <meta name="description" content={`Find flights from ${formattedOrigin} to ${formattedDestination} on ${formattedDepartureDate}. Compare prices and book your flight.`} />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="border-b border-gray-200 pb-5 mb-5">
              <h2 className="text-2xl font-bold">Flight Search Results</h2>
              {formattedOrigin && formattedDestination && (
                <p className="text-gray-500 mt-1">
                  {formattedOrigin} to {formattedDestination} • {dateDisplay}
                  {tripType === "oneWay" ? " • One Way" : " • Round Trip"}
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Searching for flights...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500">Error loading flights. Please try again.</p>
              </div>
            ) : flights.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">No flights found</h3>
                <p className="mt-2 text-gray-500">
                  We couldn't find any flights matching your search criteria.
                  <br />
                  Please try different dates or destinations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {flights.map((flight) => (
                  <FlightCard 
                    key={flight.id} 
                    flight={flight} 
                    highlighted={flight.id === cheapestFlightId}
                  />
                ))}
              </div>
            )}

            {flights.length > 0 && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Showing {flights.length} {flights.length === 1 ? 'flight' : 'flights'} for your search
                </p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
