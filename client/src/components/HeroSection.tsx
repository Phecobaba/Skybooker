import { FC } from "react";

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
}

const HeroSection: FC<HeroSectionProps> = ({
  title = "Discover Amazing Flight Deals",
  subtitle = "Book your flights with confidence and explore the world with our easy booking system."
}) => {
  return (
    <div className="relative overflow-hidden bg-primary">
      <div 
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1533749047139-189de3cf06d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
        aria-hidden="true"
      ></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-xl text-white max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
