import { FC } from "react";

interface DestinationCardProps {
  imageUrl: string;
  city: string;
  country: string;
  price: number;
}

const DestinationCard: FC<DestinationCardProps> = ({
  imageUrl,
  city,
  country,
  price
}) => {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-md h-64 group">
      <img 
        src={imageUrl} 
        alt={`${city}, ${country}`} 
        className="w-full h-full object-cover transition duration-300 ease-in-out group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h3 className="text-xl font-bold">{city}, {country}</h3>
        <p className="text-sm opacity-90">Flights from ${price}</p>
      </div>
    </div>
  );
};

const popularDestinations = [
  {
    imageUrl: "/images/destinations/paris.jpg",
    city: "Paris",
    country: "France",
    price: 399
  },
  {
    imageUrl: "/images/destinations/tokyo.jpg",
    city: "Tokyo",
    country: "Japan",
    price: 799
  },
  {
    imageUrl: "/images/destinations/cancun.jpg",
    city: "Cancun",
    country: "Mexico",
    price: 299
  },
  {
    imageUrl: "/images/destinations/dubai.jpg",
    city: "Dubai",
    country: "UAE",
    price: 549
  }
];

export const DestinationGrid: FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Popular Destinations</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {popularDestinations.map((destination, index) => (
          <DestinationCard
            key={index}
            imageUrl={destination.imageUrl}
            city={destination.city}
            country={destination.country}
            price={destination.price}
          />
        ))}
      </div>
    </div>
  );
};

export default DestinationCard;
