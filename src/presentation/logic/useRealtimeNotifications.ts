/**
 * useRealtimeNotifications - Hook personalizado para manejar notificaciones en tiempo real
 * usando Supabase Realtime postgres_changes
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@core/supabase/client";
import { useAuth } from "@core/context/AuthContext";

export interface OrderNotification {
  id: string;
  customer_id: string;
  customer_name?: string;
  business_id: string;
  total: number;
  status: string;
  delivery_type: string;
  created_at: string;
  order_items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

export interface NotificationState {
  hasNewOrder: boolean;
  latestOrder: OrderNotification | null;
  orderCount: number;
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempt: number;
  maxReconnectReached: boolean;
  isReconnecting: boolean;
}


/**
 * Hook para manejar notificaciones de nuevos pedidos en tiempo real
 * @param businessId - ID del restaurante para filtrar notificaciones
 */
export function useRealtimeNotifications(businessId?: string) {
  const [notificationState, setNotificationState] = useState<NotificationState>({
    hasNewOrder: false,
    latestOrder: null,
    orderCount: 0,
    isConnected: false,
    connectionError: null,
    reconnectAttempt: 0,
    maxReconnectReached: false,
    isReconnecting: false,
  });

  // Obtener estado de autenticación
  const { isAuthReady } = useAuth();

  // Usar ref para mantener la suscripción entre renders
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubscribedRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Use a ref to hold the setup function to avoid circular useCallback dependencies
  const setupSubscriptionRef = useRef<(() => void) | null>(null);

  const cleanupSubscription = useCallback(() => {
    isSubscribedRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (subscriptionRef.current) {
      try {
        supabase.removeChannel(subscriptionRef.current);
      } catch (e) {
        // Ignore cleanup errors
      }
      subscriptionRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setNotificationState(prev => ({
        ...prev,
        maxReconnectReached: true,
        connectionError: `Máximo de intentos de reconexión alcanzado (${MAX_RECONNECT_ATTEMPTS}). Por favor, reconecta manualmente.`,
        isReconnecting: false,
      }));
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
    reconnectAttemptRef.current += 1;

    setNotificationState(prev => ({
      ...prev,
      reconnectAttempt: reconnectAttemptRef.current,
      isReconnecting: true,
    }));

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      setupSubscriptionRef.current?.();
    }, delay);
  }, []);

  useEffect(() => {
    setupSubscriptionRef.current = () => {
      if (!isAuthReady || !businessId) return;
      if (isSubscribedRef.current) return;

      if (subscriptionRef.current) {
        try {
          supabase.removeChannel(subscriptionRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
        subscriptionRef.current = null;
      }

      // Helper compartido para procesar un nuevo pedido (viene de broadcast o de postgres_changes)
      const handleNewOrder = (orderPayload: OrderNotification) => {
        console.log('[Realtime] ✅ Nuevo pedido recibido:', orderPayload.id);
        setNotificationState(prev => ({
          ...prev,
          hasNewOrder: true,
          latestOrder: orderPayload,
          orderCount: prev.orderCount + 1,
        }));
        playNotificationSound();
        showBrowserNotification(orderPayload);
      };

      const subscription = supabase
        .channel(`restaurant_orders_${businessId}`, {
          config: {
            broadcast: { self: true },
          },
        })
        // ── BROADCAST (canal único — sin RLS, latencia mínima) ───────────────
        .on(
          'broadcast',
          { event: 'new_order' },
          ({ payload }) => {
            handleNewOrder(payload as OrderNotification);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
            reconnectAttemptRef.current = 0;
            setNotificationState(prev => ({
              ...prev,
              isConnected: true,
              connectionError: null,
              reconnectAttempt: 0,
              maxReconnectReached: false,
              isReconnecting: false,
            }));
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            isSubscribedRef.current = false;
            setNotificationState(prev => ({
              ...prev,
              isConnected: false,
              isReconnecting: false,
              connectionError: status === 'TIMED_OUT' ? 'Connection timed out' : null,
            }));
            scheduleReconnect();
          }
        });

      subscriptionRef.current = subscription;

    };
  }, [businessId, isAuthReady, scheduleReconnect]);

  // Efecto para establecer la suscripción
  useEffect(() => {
    setupSubscriptionRef.current?.();

    return () => {
      cleanupSubscription();
    };
  }, [businessId, isAuthReady, cleanupSubscription]);

  // Función para marcar notificación como leída
  const markAsRead = () => {
    setNotificationState(prev => ({
      ...prev,
      hasNewOrder: false,
    }));
  };

  // Función para resetear contador
  const resetCounter = () => {
    setNotificationState(prev => ({
      ...prev,
      orderCount: 0,
    }));
  };

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    cleanupSubscription();
    reconnectAttemptRef.current = 0;
    setNotificationState(prev => ({
      ...prev,
      reconnectAttempt: 0,
      maxReconnectReached: false,
      isReconnecting: true,
      connectionError: null,
    }));
    // Defer to next tick so cleanup completes before re-subscribing
    setTimeout(() => {
      setupSubscriptionRef.current?.();
    }, 0);
  }, [cleanupSubscription]);


  return {
    ...notificationState,
    markAsRead,
    resetCounter,
    reconnect,
  };
}

/**
 * AudioContext compartido a nivel de módulo.
 * Los navegadores limitan las instancias concurrentes (~6). Crear uno nuevo por
 * cada notificación agotaría el límite rápidamente y el sonido dejaría de
 * funcionar silenciosamente. Un único contexto reutilizable evita esta fuga.
 */
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
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

/**
 * Reproduce un sonido de notificación reutilizando el AudioContext compartido.
 */
async function playNotificationSound() {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    // El contexto puede quedar suspendido si no hubo interacción del usuario.
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Fallo silencioso si el audio no está disponible
  }
}

/**
 * Muestra una notificación en el navegador
 */
function showBrowserNotification(orderData: any) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const itemsText = orderData.order_items
        ?.map((item: any) => `${item.quantity}x ${item.product_name}`)
        .join(', ') || 'Productos varios';

      new Notification('¡Nueva Orden Recibida!', {
        body: `$${orderData.total} - ${itemsText}`,
        icon: '/favicon.svg',
        tag: `order-${orderData.id}`,
      });
    }
    // No se solicita permiso aquí: requestPermission() requiere un gesto
    // del usuario para funcionar en navegadores modernos. La solicitud
    // se maneja desde NotificationPermissionBanner.
  } catch (error) {
    // Silently fail if notification can't be shown
  }
}
