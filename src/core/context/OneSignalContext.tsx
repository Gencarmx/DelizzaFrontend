import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  requestOneSignalPermission,
  optOutOneSignal,
  optInOneSignal,
  isOneSignalSubscribed,
  getNotificationPermission,
  waitForOneSignal,
  onPushSubscriptionChange,
  offPushSubscriptionChange,
  onPermissionChange,
  offPermissionChange,
} from "@core/services/oneSignalService";

export type NotificationStatus = "default" | "granted" | "denied" | "unsupported";

interface OneSignalState {
  status: NotificationStatus;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  optOut: () => Promise<void>;
  optIn: () => Promise<void>;
}

const OneSignalContext = createContext<OneSignalState | null>(null);

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const isSupported = "Notification" in window;

  const [status, setStatus] = useState<NotificationStatus>(() => {
    if (!isSupported) return "unsupported";
    return Notification.permission as NotificationStatus;
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    // Usa el último estado conocido para evitar el parpadeo "desactivado → activado"
    // mientras el SDK de OneSignal termina de inicializar.
    return localStorage.getItem("onesignal_subscribed") === "true";
  });
  const [isLoading, setIsLoading] = useState(false);

  // Persiste el estado de suscripción para el próximo arranque
  useEffect(() => {
    localStorage.setItem("onesignal_subscribed", String(isSubscribed));
  }, [isSubscribed]);

  // Ref para evitar actualizaciones tras desmontar
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    // Sincroniza el estado real una vez que el SDK esté listo
    waitForOneSignal().then((ready) => {
      if (!mounted.current) return;
      if (ready) {
        setStatus(getNotificationPermission() as NotificationStatus);
        setIsSubscribed(isOneSignalSubscribed());
      }
    });

    const handlePermission = (granted: boolean) => {
      if (!mounted.current) return;
      setStatus(granted ? "granted" : "denied");
    };

    const handleSubscription = (event: {
      current: { optedIn: boolean; token: string | null | undefined };
    }) => {
      if (!mounted.current) return;
      setIsSubscribed(event.current?.optedIn ?? false);
      // Sincroniza también el estado del permiso del navegador
      setStatus(getNotificationPermission() as NotificationStatus);
    };

    onPermissionChange(handlePermission);
    onPushSubscriptionChange(handleSubscription);

    return () => {
      offPermissionChange(handlePermission);
      offPushSubscriptionChange(handleSubscription);
    };
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const granted = await requestOneSignalPermission();
      // Actualiza el permiso del navegador
      setStatus(granted ? "granted" : "denied");
      // La suscripción real (optedIn) la actualiza el evento onPushSubscriptionChange.
      // Si el permiso fue concedido, leemos el estado real de OneSignal inmediatamente.
      if (granted) {
        setIsSubscribed(isOneSignalSubscribed());
      }
      return granted;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const optOut = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      await optOutOneSignal();
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const optIn = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      await optInOneSignal();
      setIsSubscribed(isOneSignalSubscribed());
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return (
    <OneSignalContext.Provider value={{ status, isSubscribed, isLoading, requestPermission, optOut, optIn }}>
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignal(): OneSignalState {
  const ctx = useContext(OneSignalContext);
  if (!ctx) throw new Error("useOneSignal debe usarse dentro de <OneSignalProvider>");
  return ctx;
}
