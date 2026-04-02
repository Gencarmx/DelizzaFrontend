/**
 * usePushNotifications
 * Hook React para gestionar el estado de las Web Push Notifications.
 * Expone: estado de soporte, permiso, suscripción activa, y acciones subscribe/unsubscribe.
 */

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  enablePushNotifications,
  removePushSubscription,
} from "@core/services/pushNotificationService";

export type PushPermissionState = "unsupported" | "default" | "granted" | "denied";

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permissionState, setPermissionState] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar estado desde el navegador
  useEffect(() => {
    if (!isSupported) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PushPermissionState);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch(() => {
        setIsSubscribed(false);
      });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await enablePushNotifications();
      if (result.success) {
        setPermissionState("granted");
        setIsSubscribed(true);
      } else if (result.reason === "denied") {
        setPermissionState("denied");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      await removePushSubscription();
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
