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
        // ── BROADCAST (canal principal, sin RLS) ──────────────────────────────
        .on(
          'broadcast',
          { event: 'new_order' },
          ({ payload }) => {
            handleNewOrder(payload as OrderNotification);
          }
        )
        // ── POSTGRES_CHANGES (backup, puede fallar si RLS bloquea el evento) ──
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `business_id=eq.${businessId}`,
          },
          async (payload) => {
            try {
              // Fetch order details with items
              const { data: orderDetails, error } = await supabase
                .from('orders')
                .select(`
                  *,
                  order_items (
                    product_name,
                    quantity,
                    price
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (error || !orderDetails) {
                console.warn('[Realtime][pg_changes] No se pudo obtener detalle del pedido, usando payload base');
                const fallbackOrder = {
                  ...payload.new as Record<string, unknown>,
                  order_items: [],
                } as unknown as OrderNotification;
                handleNewOrder(fallbackOrder);
                return;
              }

              handleNewOrder(orderDetails as unknown as OrderNotification);
            } catch (error) {
              console.error('[Realtime][pg_changes] Error procesando notificación:', error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `business_id=eq.${businessId}`,
          },
          (_payload) => {
            // Pedido actualizado - reservado para uso futuro
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
 * Reproduce un sonido de notificación
 */
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  } catch (error) {
    // Silently fail if audio can't be played
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
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  } catch (error) {
    // Silently fail if notification can't be shown
  }
}
