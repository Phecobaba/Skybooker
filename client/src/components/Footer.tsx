import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Linkedin, MapPin, Phone, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Footer() {
  const { data: logoSetting } = useQuery({
    queryKey: ["/api/site-settings/logo"],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch("/api/site-settings/logo", { signal });
        if (!res.ok) {
          if (res.status === 404) {
            return null;
          }
          console.error("Error fetching logo setting:", await res.text());
          return null;
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching logo setting:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data: addressSetting } = useQuery({
    queryKey: ["/api/site-settings/address"],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch("/api/site-settings/address", { signal });
        if (!res.ok) {
          if (res.status === 404) {
            return null;
          }
          console.error("Error fetching address setting:", await res.text());
          return null;
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching address setting:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data: phoneSetting } = useQuery({
    queryKey: ["/api/site-settings/phone"],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch("/api/site-settings/phone", { signal });
        if (!res.ok) {
          if (res.status === 404) {
            return null;
          }
          console.error("Error fetching phone setting:", await res.text());
          return null;
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching phone setting:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data: emailSetting } = useQuery({
    queryKey: ["/api/site-settings/email"],
    queryFn: async ({ signal }) => {
      try {
        const res = await fetch("/api/site-settings/email", { signal });
        if (!res.ok) {
          if (res.status === 404) {
            return null;
          }
          console.error("Error fetching email setting:", await res.text());
          return null;
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching email setting:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="text-2xl font-bold mb-4">
              {logoSetting?.value ? (
                <img 
                  src={logoSetting.value} 
                  alt="SkyBooker Logo" 
                  className="h-8 w-auto"
                />
              ) : (
                <span>
                  Sky<span className="text-orange-500">Booker</span>
                </span>
              )}
            </div>
            <p className="text-gray-300 mb-4">
              Book your flights with confidence. Explore the world with our easy and secure booking system.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-300 hover:text-white transition-colors">
                  Search Flights
                </Link>
              </li>
              <li>
                <Link href="/my-bookings" className="text-gray-300 hover:text-white transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Profile
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-white transition-colors">
                  Terms & Conditions
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{addressSetting?.value || "123 Aviation Way, Flight City, FC 10000"}</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{phoneSetting?.value || "+1 (555) 123-4567"}</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{emailSetting?.value || "support@skybooker.com"}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} SkyBooker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
