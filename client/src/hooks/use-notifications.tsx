import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookingWithDetails } from "@shared/schema";

export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
  type: "booking" | "payment" | "system";
  bookingId?: number;
};

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Load user's bookings for notifications
  const { data: bookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  
  // Generate notifications based on bookings
  useEffect(() => {
    if (!bookings.length) return;
    
    const bookingNotifications: Notification[] = [];
    
    // Find bookings with certain statuses and create notifications
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.bookingDate);
      
      // Add notification for bookings waiting for payment
      if (booking.status === "Pending Payment") {
        bookingNotifications.push({
          id: `booking-payment-${booking.id}`,
          title: "Payment Required",
          message: `Your booking to ${booking.flight.destination.name} needs payment to be confirmed.`,
          read: false,
          timestamp: bookingDate,
          type: "payment",
          bookingId: booking.id
        });
      }
      
      // Add notification for bookings that have been confirmed
      if (booking.status === "Confirmed") {
        bookingNotifications.push({
          id: `booking-confirmed-${booking.id}`,
          title: "Booking Confirmed",
          message: `Your booking to ${booking.flight.destination.name} has been confirmed!`,
          read: false,
          timestamp: new Date(booking.bookingDate),
          type: "booking",
          bookingId: booking.id
        });
      }
      
      // Add notification for declined bookings
      if (booking.status === "Declined") {
        bookingNotifications.push({
          id: `booking-declined-${booking.id}`,
          title: "Booking Declined",
          message: `Your booking to ${booking.flight.destination.name} has been declined. ${booking.declineReason ? `Reason: ${booking.declineReason}` : ''}`,
          read: false,
          timestamp: new Date(booking.bookingDate),
          type: "booking",
          bookingId: booking.id
        });
      }
    });
    
    // Add the notifications to state (avoiding duplicates)
    setNotifications(prevNotifications => {
      const existingIds = new Set(prevNotifications.map(n => n.id));
      const newNotifications = bookingNotifications.filter(n => !existingIds.has(n.id));
      
      // Combine existing and new notifications, sort by timestamp (newest first)
      return [...prevNotifications, ...newNotifications].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    });
  }, [bookings]);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // Add a new notification
  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
  };
  
  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}