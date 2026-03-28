/**
 * RestaurantNotificationsContext - Contexto global para notificaciones del restaurante
 *
 * Responsabilidades:
 * 1. Resolver y exponer businessId del owner autenticado (una sola vez).
 * 2. Mantener la suscripción Realtime activa mientras el owner navega.
 */

import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRealtimeNotifications, type OrderNotification } from "@presentation/logic/useRealtimeNotifications";
import { useAuth } from "@core/context/AuthContext";
import { getBusinessByOwner } from "@core/services/businessService";

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
  /** ID del restaurante resuelto. null mientras carga o si no existe. */
  businessId: string | null;
  /** true mientras se consulta el businessId por primera vez */
  businessIdLoading: boolean;
}


const RestaurantNotificationsContext = createContext<RestaurantNotificationsContextType | undefined>(undefined);

export function RestaurantNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, profileId, isAuthReady, role } = useAuth();

  const [businessId, setBusinessIdState] = useState<string | null>(null);
  const [businessIdLoading, setBusinessIdLoading] = useState(true);
  const resolvedForUserRef = useRef<string | null>(null); // evita re-fetch para el mismo user

  // Resolver businessId UNA SOLA VEZ por usuario.
  // Usar user.id (string primitivo) como dependencia — es estable entre re-renders.
  const userId = user?.id ?? null;

  useEffect(() => {
    // Esperar a que auth esté listo Y confirmado como owner antes de hacer nada.
    // Mientras !isAuthReady, mantener businessIdLoading=true (spinner del layout)
    // para evitar montar/desmontar el Outlet durante el flujo de auth.
    if (!isAuthReady) return;

    if (role !== "owner" || !userId || !profileId) {
      // Auth listo pero no es owner (o no hay sesión) — ya no hay nada que cargar
      setBusinessIdState(null);
      setBusinessIdLoading(false);
      resolvedForUserRef.current = null;
      return;
    }

    // Ya resuelto para este usuario — no volver a consultar
    if (resolvedForUserRef.current === userId) return;

    resolvedForUserRef.current = userId;
    // businessIdLoading ya es true desde el estado inicial — no hace falta setear

    // profileId ya resuelto por AuthContext — getBusinessByOwner no necesita consultar profiles
    getBusinessByOwner(profileId)
      .then(business => {
        setBusinessIdState(business?.id ?? null);
      })
      .catch(() => {
        setBusinessIdState(null);
      })
      .finally(() => {
        setBusinessIdLoading(false);
      });
  }, [userId, profileId, isAuthReady, role]);

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

  const markAsRead = useCallback(() => {
    hookMarkAsRead();
  }, [hookMarkAsRead]);

  const resetCounter = useCallback(() => {
    hookResetCounter();
  }, [hookResetCounter]);

  const reconnect = useCallback(() => {
    hookReconnect();
  }, [hookReconnect]);

  const value = useMemo(() => ({
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
    businessIdLoading,
  }), [
    hasNewOrder, latestOrder, orderCount, isConnected, connectionError,
    reconnectAttempt, maxReconnectReached, isReconnecting,
    markAsRead, resetCounter, reconnect, businessId, businessIdLoading,
  ]);

  return (
    <RestaurantNotificationsContext.Provider value={value}>
      {children}
    </RestaurantNotificationsContext.Provider>
  );
}

export function useRestaurantNotifications() {
  const context = useContext(RestaurantNotificationsContext);
  if (undefined === context) {
    throw new Error("useRestaurantNotifications must be used within a RestaurantNotificationsProvider");
  }
  return context;
}
