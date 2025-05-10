import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const [currentPath] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return currentPath === path;
  };

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                {logoSetting?.value ? (
                  <img
                    src={logoSetting.value}
                    alt="SkyBooker Logo"
                    className="h-8 w-auto cursor-pointer"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary cursor-pointer">
                    Sky<span className="text-orange-500">Booker</span>
                  </span>
                )}
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <span
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer",
                    isActive("/")
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Home
                </span>
              </Link>
              {user && (
                <Link href="/my-bookings">
                  <span
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer",
                      isActive("/my-bookings")
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    My Bookings
                  </span>
                </Link>
              )}
              {user?.isAdmin && (
                <Link href="/admin">
                  <span
                    className={cn(
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer",
                      currentPath.startsWith("/admin")
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    Admin Panel
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <>
                <NotificationBell />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex text-sm rounded-full items-center gap-2 group ml-3"
                    >
                      <span className="inline-block p-1 rounded-full bg-primary text-white">
                        <User className="h-4 w-4" />
                      </span>
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <ChevronDown className="h-4 w-4 group-hover:text-primary" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/my-bookings">My Bookings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/auth">
                <Button className="ml-3" variant="default">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          <div className="-mr-2 flex items-center sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <Link href="/">
                <span
                  className={cn(
                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer",
                    isActive("/")
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  Home
                </span>
              </Link>
              {user && (
                <Link href="/my-bookings">
                  <span
                    className={cn(
                      "block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer",
                      isActive("/my-bookings")
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    My Bookings
                  </span>
                </Link>
              )}
              {user?.isAdmin && (
                <Link href="/admin">
                  <span
                    className={cn(
                      "block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer",
                      currentPath.startsWith("/admin")
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    Admin Panel
                  </span>
                </Link>
              )}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              {user ? (
                <>
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        {user.email}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <NotificationBell />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Link href="/profile">
                      <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer">
                        Profile
                      </span>
                    </Link>
                    <Link href="/my-bookings">
                      <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer">
                        My Bookings
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 space-y-1">
                  <Link href="/auth">
                    <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer">
                      Sign In
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
