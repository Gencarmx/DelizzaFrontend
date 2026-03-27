import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@core/supabase/client";
import { useAuth } from "@core/context/AuthContext";

const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * AudioContext compartido a nivel de módulo.
 * Crear uno nuevo por cada notificación agotaría el límite del navegador (~6
 * instancias) y el sonido dejaría de funcionar silenciosamente.
 */
let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedAudioContext = new AudioContextClass();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function useCustomerNotifications(
  onOrderUpdate?: () => void,
  onInAppNotification?: (title: string, body: string) => void,
) {
  const { user } = useAuth();

  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const lastNotifiedStatusRef = useRef<Record<string, string>>({});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const profileIdRef = useRef<string | null>(null);
  const onOrderUpdateRef = useRef(onOrderUpdate);
  const onInAppNotificationRef = useRef(onInAppNotification);
  // Flag global de desmontaje. Se verifica al inicio de setupSubscription
  // para evitar que timers de reconexión que escaparon al cleanup sigan
  // ejecutándose y llamen a setters de estado en un componente desmontado.
  const unmountedRef = useRef(false);

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus("denied");
    }
  }, []);

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
      // Usar el AudioContext compartido a nivel de módulo en lugar de crear
      // uno nuevo por cada notificación, evitando la fuga de recursos.
      const audioContext = getSharedAudioContext();
      if (!audioContext) return;

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
    // Verificar que el hook no haya sido desmontado antes de operar.
    // Timers de reconexión retrasados pueden dispararse después del desmontaje.
    if (unmountedRef.current) return;
    if (isSubscribedRef.current) return;

    if (subscriptionRef.current) {
      try { supabase.removeChannel(subscriptionRef.current); } catch { /* ignore */ }
      subscriptionRef.current = null;
    }

    isSubscribedRef.current = true;

    // Handler compartido para actualización de estado
    const handleOrderUpdate = (orderPayload: { id: string; status: string;[key: string]: unknown }) => {
      const { id, status } = orderPayload;
      if (lastNotifiedStatusRef.current[id] === status) {
        return; // Esta actualización ya fue notificada, evitamos duplicados
      }
      lastNotifiedStatusRef.current[id] = status;

      onOrderUpdateRef.current?.();
      playNotificationSound();
      showBrowserNotification(orderPayload);
    };

    const subscription = supabase
      .channel(`customer_orders_${profileId}`, {
        config: { broadcast: { ack: true } },
      })
      // ── BROADCAST (canal único — sin RLS, latencia mínima) ───────────────
      .on(
        "broadcast",
        { event: "order_status_update" },
        ({ payload }) => {
          console.log("[Customer] ✅ Actualización de pedido recibida (Broadcast):", payload);
          handleOrderUpdate(payload as { id: string; status: string });
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
    // Resetear el flag de desmontaje al (re)montar el hook.
    unmountedRef.current = false;

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
      // Marcar como desmontado ANTES de cancelar el timer para que cualquier
      // callback pendiente del setTimeout no vuelva a llamar setupSubscription.
      unmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (subscriptionRef.current) {
        try { supabase.removeChannel(subscriptionRef.current); } catch { /* ignore */ }
        subscriptionRef.current = null;
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
