/**
 * RestaurantNotificationsContext - Contexto global para notificaciones del restaurante
 * 
 * Este contexto mantiene la suscripción a notificaciones en tiempo real activa
 * incluso cuando el usuario navega entre diferentes pestañas del panel de restaurante.
 */

import { createContext, useContext, useState, useCallback } from "react";
import { useRealtimeNotifications, type OrderNotification } from "@presentation/logic/useRealtimeNotifications";

interface RestaurantNotificationsContextType {
  hasNewOrder: boolean;
  latestOrder: OrderNotification | null;
  orderCount: number;
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempt: number;
  maxReconnectReached: boolean;
  isReconnecting: boolean;
  markAsRead: () => void;
  resetCounter: () => void;
  reconnect: () => void;
  businessId: string | null;
  setBusinessId: (id: string | null) => void;
}


const RestaurantNotificationsContext = createContext<RestaurantNotificationsContextType | undefined>(undefined);

export function RestaurantNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [businessId, setBusinessId] = useState<string | null>(null);
  
  // Usar el hook de notificaciones con el businessId actual
  const {
    hasNewOrder,
    latestOrder,
    orderCount,
    isConnected,
    connectionError,
    reconnectAttempt,
    maxReconnectReached,
    isReconnecting,
    markAsRead: hookMarkAsRead,
    resetCounter: hookResetCounter,
    reconnect: hookReconnect,
  } = useRealtimeNotifications(businessId || undefined);


  // Wrapper functions para exponer en el contexto
  const markAsRead = useCallback(() => {
    hookMarkAsRead();
  }, [hookMarkAsRead]);

  const resetCounter = useCallback(() => {
    hookResetCounter();
  }, [hookResetCounter]);

  const reconnect = useCallback(() => {
    hookReconnect();
  }, [hookReconnect]);

  const value = {
    hasNewOrder,
    latestOrder,
    orderCount,
    isConnected,
    connectionError,
    reconnectAttempt,
    maxReconnectReached,
    isReconnecting,
    markAsRead,
    resetCounter,
    reconnect,
    businessId,
    setBusinessId,
  };


  return (
    <RestaurantNotificationsContext.Provider value={value}>
      {children}
    </RestaurantNotificationsContext.Provider>
  );
}

export function useRestaurantNotifications() {
  const context = useContext(RestaurantNotificationsContext);
  if (context === undefined) {
    throw new Error("useRestaurantNotifications must be used within a RestaurantNotificationsProvider");
  }
  return context;
}
