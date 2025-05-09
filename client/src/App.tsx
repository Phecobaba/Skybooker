import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import SearchResultsPage from "@/pages/search-results-page";
import BookingPage from "@/pages/booking-page";
import PaymentPage from "@/pages/payment-page";
import MyBookingsPage from "@/pages/my-bookings-page";
import ProfilePage from "@/pages/profile-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import AdminDashboardPage from "@/pages/admin/dashboard-page";
import AdminFlightsPage from "@/pages/admin/flights-page";
import AdminLocationsPage from "@/pages/admin/locations-page";
import AdminBookingsPage from "@/pages/admin/bookings-page";
import AdminPaymentsPage from "@/pages/admin/payments-page";
import AdminPaymentSettingsPage from "@/pages/admin/payment-settings-page";
import AdminUsersPage from "@/pages/admin/users-page";
import AdminAccountSettingsPage from "@/pages/admin/account-settings-page";
import AdminSiteSettingsPage from "@/pages/admin/site-settings-page";
import AdminPageContentsPage from "@/pages/admin/page-contents-page";
import PageContentPage from "@/pages/page-content";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import SmartSupp from "@/components/SmartSupp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/search" component={SearchResultsPage} />
      <Route path="/page/:slug" component={PageContentPage} />
      <ProtectedRoute path="/booking/:flightId" component={BookingPage} />
      <ProtectedRoute path="/payment/:bookingId" component={PaymentPage} />
      <ProtectedRoute path="/my-bookings" component={MyBookingsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboardPage} adminOnly />
      <ProtectedRoute path="/admin/flights" component={AdminFlightsPage} adminOnly />
      <ProtectedRoute path="/admin/locations" component={AdminLocationsPage} adminOnly />
      <ProtectedRoute path="/admin/bookings" component={AdminBookingsPage} adminOnly />
      <ProtectedRoute path="/admin/payments" component={AdminPaymentsPage} adminOnly />
      <ProtectedRoute path="/admin/payment-settings" component={AdminPaymentSettingsPage} adminOnly />
      <ProtectedRoute path="/admin/users" component={AdminUsersPage} adminOnly />
      <ProtectedRoute path="/admin/site-settings" component={AdminSiteSettingsPage} adminOnly />
      <ProtectedRoute path="/admin/page-contents" component={AdminPageContentsPage} adminOnly />
      <ProtectedRoute path="/admin/settings" component={AdminAccountSettingsPage} adminOnly />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <SmartSupp />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
