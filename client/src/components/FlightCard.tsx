import { FC } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { Plane, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FlightWithLocations } from "@shared/schema";

interface FlightCardProps {
  flight: FlightWithLocations;
  highlighted?: boolean;
}

const FlightCard: FC<FlightCardProps> = ({ flight, highlighted = false }) => {
  const { departureTime, arrivalTime, price, origin, destination } = flight;
  
  // Calculate flight duration
  const duration = formatDistanceStrict(
    new Date(arrivalTime),
    new Date(departureTime)
  );
  
  // Format times
  const departureFormatted = format(new Date(departureTime), "h:mm a");
  const arrivalFormatted = format(new Date(arrivalTime), "h:mm a");
  
  return (
    <div 
      className={cn(
        "bg-white rounded-lg shadow-md p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
        highlighted && "border-l-4 border-orange-500"
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary mr-3">
              <Plane className="h-5 w-5" />
            </span>
            <div>
              <div className="text-lg font-bold">{departureFormatted}</div>
              <div className="text-gray-500">{origin.code} - {origin.city}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 my-4 md:my-0 flex justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-500 flex items-center justify-center">
              <Timer className="h-4 w-4 mr-1" /> {duration}
            </div>
            <div className="relative">
              <div className="w-28 md:w-40 border-t border-gray-300 mt-3"></div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"></div>
            </div>
            <div className="text-sm text-gray-500 mt-1">Direct Flight</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end md:justify-start">
            <div className="text-right md:text-left md:mr-3">
              <div className="text-lg font-bold">{arrivalFormatted}</div>
              <div className="text-gray-500">{destination.code} - {destination.city}</div>
            </div>
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary ml-3 md:ml-0">
              <Plane className="h-5 w-5 transform rotate-90" />
            </span>
          </div>
        </div>

        <div className="flex-1 mt-4 md:mt-0 flex flex-col md:items-end">
          <div className={cn(
            "text-xl font-bold",
            highlighted ? "text-orange-500" : "text-primary"
          )}>
            ${price.toFixed(2)}
          </div>
          <div className="text-gray-500 text-sm">per person</div>
          <Link href={`/booking/${flight.id}`}>
            <Button 
              className="mt-2 bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Select Flight
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
