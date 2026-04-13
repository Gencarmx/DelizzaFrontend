// src/core/hooks/useOneSignal.ts

import { useState, useEffect, useCallback } from "react";
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

export interface UseOneSignalReturn {
  status: NotificationStatus;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  optOut: () => Promise<void>;
  optIn: () => Promise<void>;
}

export function useOneSignal(): UseOneSignalReturn {
  const isSupported = "Notification" in window;

  // Arrancamos con los valores del navegador; se corregirán cuando OneSignal
  // termine de inicializarse (puede haber un breve instante de "default").
  const [status, setStatus] = useState<NotificationStatus>(() => {
    if (!isSupported) return "unsupported";
    return Notification.permission as NotificationStatus;
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupported) return;

    let cancelled = false;

    // Espera a que el SDK inicialice para leer el estado real
    waitForOneSignal().then((ready) => {
      if (cancelled) return;
      if (ready) {
        setStatus(getNotificationPermission() as NotificationStatus);
        setIsSubscribed(isOneSignalSubscribed());
      }
    });

    // Escucha cambios de permiso del navegador (el usuario acepta/bloquea el prompt)
    const handlePermission = (granted: boolean) => {
      if (cancelled) return;
      setStatus(granted ? "granted" : "denied");
    };

    // Escucha cambios de suscripción (optIn / optOut desde otra pestaña o dispositivo)
    const handleSubscription = (event: {
      current: { optedIn: boolean; token: string | null };
    }) => {
      if (cancelled) return;
      setIsSubscribed(event.current?.optedIn ?? false);
    };

    onPermissionChange(handlePermission);
    onPushSubscriptionChange(handleSubscription);

    return () => {
      cancelled = true;
      offPermissionChange(handlePermission);
      offPushSubscriptionChange(handleSubscription);
    };
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const granted = await requestOneSignalPermission();
      setStatus(granted ? "granted" : "denied");
      setIsSubscribed(granted);
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
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { status, isSubscribed, isLoading, requestPermission, optOut, optIn };
}
