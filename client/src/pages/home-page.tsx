import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FlightSearchForm from "@/components/FlightSearchForm";
import { DestinationGrid } from "@/components/DestinationCard";
import { Helmet } from "react-helmet";

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>SkyBooker - Book Your Flights with Confidence</title>
        <meta name="description" content="Find and book flights to destinations worldwide. SkyBooker offers easy flight booking and secure payment options." />
        <meta property="og:title" content="SkyBooker - Book Your Flights with Confidence" />
        <meta property="og:description" content="Find and book flights to destinations worldwide. SkyBooker offers easy flight booking and secure payment options." />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <HeroSection />
          <FlightSearchForm />
          <DestinationGrid />
        </main>
        <Footer />
      </div>
    </>
  );
}
