/**
 * CustomerNotificationsContext - Contexto global para notificaciones del cliente
 */

import { createContext, useContext } from "react";
import { useCustomerNotifications } from "@presentation/logic/useCustomerNotifications";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CustomerNotificationsContextType {}

const CustomerNotificationsContext = createContext<
  CustomerNotificationsContextType | undefined
>(undefined);

export function CustomerNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inicializamos el hook aquí para que esté activo mientras la app esté montada
  useCustomerNotifications();

  return (
    <CustomerNotificationsContext.Provider value={{}}>
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
