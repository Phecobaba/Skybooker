import { Link, useLocation } from "wouter";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  title: string;
  description?: string;
  showBackButton?: boolean;
  backButtonUrl?: string;
}

export default function AdminHeader({ 
  title, 
  description, 
  showBackButton = true, 
  backButtonUrl = "/admin" 
}: AdminHeaderProps) {
  const [location] = useLocation();
  
  // Only show the back button on deeper admin pages, not on main admin pages
  // where the sidebar is already visible
  const isMainAdminPage = [
    "/admin",
    "/admin/flights",
    "/admin/locations",
    "/admin/bookings",
    "/admin/payments",
    "/admin/payment-settings",
    "/admin/users", 
    "/admin/site-settings",
    "/admin/page-contents",
    "/admin/settings"
  ].includes(location);
  
  const shouldShowBackButton = showBackButton && !isMainAdminPage;
  
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {shouldShowBackButton && (
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            asChild
            className="flex items-center gap-1"
          >
            <Link href={backButtonUrl}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}