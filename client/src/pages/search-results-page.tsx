import { useState, useEffect } from "react";
import { useSearch } from "wouter";
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [flights, setFlights] = useState<FlightWithLocations[]>([]);
  const [originName, setOriginName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  
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

  // Function to find the cheapest flight
  const getCheapestFlightId = () => {
    if (!flights.length) return null;
    return flights.reduce((cheapest, current) => 
      current.economyPrice < cheapest.economyPrice ? current : cheapest
    ).id;
  };

  // Run search when component loads
  useEffect(() => {
    // This function is executed when component mounts
    if (!origin || !destination || !departureDate) {
      setIsLoading(false);
      return;
    }

    // Direct function to fetch data without async/await
    // to avoid React hook warnings
    fetch(`/api/locations`)
      .then(res => res.json())
      .then(locationsData => {
        // Find origin and destination locations
        const originLoc = locationsData.find((loc: any) => loc.code === origin);
        const destLoc = locationsData.find((loc: any) => loc.code === destination);
        
        if (originLoc) {
          setOriginName(`${originLoc.city} (${originLoc.code})`);
        }
        
        if (destLoc) {
          setDestinationName(`${destLoc.city} (${destLoc.code})`);
        }
        
        // Construct search URL
        const params = new URLSearchParams();
        params.set('origin', origin);
        params.set('destination', destination);
        params.set('departureDate', departureDate);
        if (returnDate) params.set('returnDate', returnDate);
        
        // Fetch flights
        return fetch(`/api/flights/search?${params.toString()}`);
      })
      .then(res => res.json())
      .then(flightData => {
        // Ensure flightData is an array
        if (Array.isArray(flightData)) {
          setFlights(flightData);
        } else if (flightData.error) {
          // Handle API error
          throw new Error(flightData.error);
        } else {
          // Handle unexpected response format
          console.error("Unexpected response format:", flightData);
          setFlights([]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError(err);
        setIsLoading(false);
      });
  }, [origin, destination, departureDate, returnDate]);

  const cheapestFlightId = getCheapestFlightId();

  return (
    <>
      <Helmet>
        <title>Flight Search Results | SkyBooker</title>
        <meta name="description" content={`Find flights from ${originName} to ${destinationName} on ${formattedDepartureDate}. Compare prices and book your flight.`} />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="border-b border-gray-200 pb-5 mb-5">
              <h2 className="text-2xl font-bold">Flight Search Results</h2>
              {originName && destinationName && (
                <p className="text-gray-500 mt-1">
                  {originName} to {destinationName} • {dateDisplay}
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
                <p className="text-sm text-gray-500 mt-2">{error.message}</p>
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
