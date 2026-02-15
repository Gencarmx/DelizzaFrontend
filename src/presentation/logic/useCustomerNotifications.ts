/**
 * useCustomerNotifications - Hook para manejar notificaciones de pedidos para clientes
 * Escucha cambios en el estado de los pedidos en tiempo real
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@core/supabase/client";
import { useAuth } from "@core/context/AuthContext";

/**
 * Hook para manejar notificaciones de actualizaciones de pedidos para clientes
 */
export function useCustomerNotifications() {
  const { user } = useAuth();

  // Usar ref para mantener estados entre renders sin causar re-renders
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  // Reproducir sonido
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Sonido diferente al del restaurante (más suave)
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

  // Solicitar permiso de notificaciones
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

    // Si ya está concedido, retornar true
    if (Notification.permission === "granted") return true;

    // Si no, pedir permiso
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  // Mostrar notificación del navegador
  const showBrowserNotification = useCallback(
    async (order: any) => {
      if (!("Notification" in window)) return;

      if (Notification.permission !== "granted") {
        // Intentar pedir permiso si no está concedido (esto podría fallar sin user gesture, pero intentamos)
        const granted = await requestPermission();
        if (!granted) return;
      }

      const title = "¡Tu pedido ha sido actualizado!";
      const body = `Tu pedido está ahora: ${translateStatus(order.status)}`;
      const icon = "/favicon.svg";
      const tag = `order-update-${order.id}`;

      // Intentar usar ServiceWorkerRegistration si está disponible (Mejor para Android)
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            await registration.showNotification(title, {
              body,
              icon,
              tag,
              vibrate: [200, 100, 200],
              badge: "/favicon.svg",
            });
            return;
          }
        } catch (e) {
          console.warn(
            "No se pudo usar SW para notificación, usando fallback",
            e,
          );
        }
      }

      // Fallback a new Notification()
      new Notification(title, {
        body,
        icon,
        tag,
      });
    },
    [requestPermission],
  );

  const setupSubscription = useCallback(async () => {
    if (!user) return;

    // Obtener profile.id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return;

    if (isSubscribedRef.current) return;

    // Limpiar suscripción anterior
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    isSubscribedRef.current = true;

    // Suscribirse a cambios en orders para este cliente
    const subscription = supabase
      .channel(`customer_orders_${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE", // Solo nos interesan actualizaciones de estado
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${profile.id}`,
        },
        async (payload) => {
          // Verificar si el estado cambió
          if (payload.old.status !== payload.new.status) {
            console.log("📦 Pedido actualizado:", payload.new.status);

            // Reproducir sonido
            playNotificationSound();

            // Mostrar notificación
            showBrowserNotification(payload.new);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("🔔 Suscrito a notificaciones de cliente");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          isSubscribedRef.current = false;
        }
      });

    subscriptionRef.current = subscription;
  }, [user, playNotificationSound, showBrowserNotification]);

  useEffect(() => {
    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      isSubscribedRef.current = false;
    };
  }, [setupSubscription]);

  return { requestPermission };
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
