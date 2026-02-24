import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@core/supabase/client";
import { useAuth } from "@core/context/AuthContext";

const MAX_RECONNECT_ATTEMPTS = 5;

export function useCustomerNotifications(
  onOrderUpdate?: () => void,
  onInAppNotification?: (title: string, body: string) => void,
) {
  const { user } = useAuth();

  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const profileIdRef = useRef<string | null>(null);
  const onOrderUpdateRef = useRef(onOrderUpdate);
  const onInAppNotificationRef = useRef(onInAppNotification);

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>(
      "Notification" in window ? Notification.permission : "denied",
    );

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [maxReconnectReached, setMaxReconnectReached] = useState(false);

  useEffect(() => {
    onOrderUpdateRef.current = onOrderUpdate;
  }, [onOrderUpdate]);

  useEffect(() => {
    onInAppNotificationRef.current = onInAppNotification;
  }, [onInAppNotification]);

  const playNotificationSound = useCallback(async () => {
    try {
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.5,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // Ignorar errores de audio
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

    if (Notification.permission === "granted") {
      setPermissionStatus("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      setPermissionStatus("denied");
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    return permission === "granted";
  }, []);

  const showBrowserNotification = useCallback(
    async (order: any) => {
      const title = "¡Tu pedido ha sido actualizado!";
      const body = `Tu pedido está ahora: ${translateStatus(order.status)}`;

      if (!("Notification" in window)) {
        onInAppNotificationRef.current?.(title, body);
        return;
      }

      if (Notification.permission !== "granted") {
        onInAppNotificationRef.current?.(title, body);
        return;
      }

      const icon = "/favicon.svg";
      const tag = `order-update-${order.id}`;

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            await registration.showNotification(title, {
              body,
              icon,
              tag,
              badge: "/favicon.svg",
            } as NotificationOptions & { vibrate?: number[] });
            return;
          }
        } catch (e) {
          console.warn(
            "No se pudo usar SW para notificación, usando fallback",
            e,
          );
        }
      }

      new Notification(title, { body, icon, tag });
    },
    [],
  );

  const setupSubscription = useCallback(async (profileId: string) => {
    if (isSubscribedRef.current) return;

    if (subscriptionRef.current) {
      try { subscriptionRef.current.unsubscribe(); } catch { /* ignore */ }
    }

    isSubscribedRef.current = true;

    const subscription = supabase
      .channel(`customer_orders_${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${profileId}`,
        },
        async (payload) => {
          onOrderUpdateRef.current?.();

          if (
            payload.eventType === "UPDATE" &&
            payload.old.status !== payload.new.status
          ) {
            playNotificationSound();
            showBrowserNotification(payload.new);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          reconnectAttemptRef.current = 0;
          setIsConnected(true);
          setIsReconnecting(false);
          setReconnectAttempt(0);
          setMaxReconnectReached(false);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsConnected(false);
          setIsReconnecting(false);
          isSubscribedRef.current = false;

          if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setMaxReconnectReached(true);
            return;
          }

          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;
          setReconnectAttempt(reconnectAttemptRef.current);
          setIsReconnecting(true);

          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (profileIdRef.current) setupSubscription(profileIdRef.current);
          }, delay);
        }
      });

    subscriptionRef.current = subscription;
  }, [playNotificationSound, showBrowserNotification]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (cancelled || !profile) return;
        profileIdRef.current = profile.id;
        setupSubscription(profile.id);
      });

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (subscriptionRef.current) {
        try { subscriptionRef.current.unsubscribe(); } catch { /* ignore */ }
      }
      isSubscribedRef.current = false;
      profileIdRef.current = null;
    };
  }, [user, setupSubscription]);

  const reconnect = useCallback(() => {
    if (!profileIdRef.current) return;
    reconnectAttemptRef.current = 0;
    isSubscribedRef.current = false;
    setReconnectAttempt(0);
    setMaxReconnectReached(false);
    setIsReconnecting(true);
    setupSubscription(profileIdRef.current);
  }, [setupSubscription]);

  return {
    requestPermission,
    permissionStatus,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    maxReconnectReached,
    reconnect,
  };
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    preparing: "Preparando",
    ready: "Listo para entregar / recoger",
    completed: "Entregado",
    cancelled: "Cancelado",
  };
  return map[status] || status;
}
