/**
 * CustomerNotificationsContext - Contexto global para notificaciones del cliente
 */

import { createContext, useContext, useCallback, useRef } from "react";
import { useCustomerNotifications } from "@presentation/logic/useCustomerNotifications";

interface CustomerNotificationsContextType {
  requestPermission: () => Promise<boolean>;
  permissionStatus: NotificationPermission;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  maxReconnectReached: boolean;
  reconnect: () => void;
  registerOrderUpdateCallback: (cb: (() => void) | null) => void;
  registerInAppNotificationCallback: (
    cb: ((title: string, body: string) => void) | null,
  ) => void;
}

const CustomerNotificationsContext = createContext<
  CustomerNotificationsContextType | undefined
>(undefined);

export function CustomerNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const orderUpdateCallbackRef = useRef<(() => void) | null>(null);
  const inAppNotificationCallbackRef = useRef<
    ((title: string, body: string) => void) | null
  >(null);

  const onOrderUpdate = useCallback(() => {
    orderUpdateCallbackRef.current?.();
  }, []);

  const onInAppNotification = useCallback((title: string, body: string) => {
    inAppNotificationCallbackRef.current?.(title, body);
  }, []);

  const {
    requestPermission,
    permissionStatus,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    maxReconnectReached,
    reconnect,
  } = useCustomerNotifications(onOrderUpdate, onInAppNotification);

  const registerOrderUpdateCallback = useCallback(
    (cb: (() => void) | null) => {
      orderUpdateCallbackRef.current = cb;
    },
    [],
  );

  const registerInAppNotificationCallback = useCallback(
    (cb: ((title: string, body: string) => void) | null) => {
      inAppNotificationCallbackRef.current = cb;
    },
    [],
  );

  return (
    <CustomerNotificationsContext.Provider
      value={{
        requestPermission,
        permissionStatus,
        isConnected,
        isReconnecting,
        reconnectAttempt,
        maxReconnectReached,
        reconnect,
        registerOrderUpdateCallback,
        registerInAppNotificationCallback,
      }}
    >
      {children}
    </CustomerNotificationsContext.Provider>
  );
}

export function useCustomerNotificationsContext() {
  const context = useContext(CustomerNotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useCustomerNotificationsContext must be used within a CustomerNotificationsProvider",
    );
  }
  return context;
}
