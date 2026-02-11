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


  // Función para establecer la suscripción
  const setupSubscription = useCallback(() => {
    // Esperar a que la autenticación esté lista
    if (!isAuthReady) {
      return;
    }

    if (!businessId) {
      return;
    }

    // Evitar suscripciones duplicadas
    if (isSubscribedRef.current) {
      return;
    }

    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    isSubscribedRef.current = true;

    // Suscribirse a cambios en la tabla orders
    const subscription = supabase
      .channel(`restaurant_orders_${businessId}`, {
        config: {
          broadcast: { self: true },
        },
      })
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
            // Esperar un momento para asegurar que los order_items estén commitados
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Obtener detalles completos del pedido incluyendo items
            let orderDetails = null;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
              const { data, error } = await supabase
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

              if (error) {
                console.error(`Error obteniendo detalles del pedido (intento ${retryCount + 1}):`, error);
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
                continue;
              }

              // Verificar si tenemos order_items
              if (!data.order_items || data.order_items.length === 0) {
                console.warn(`Pedido ${payload.new.id} sin order_items, reintentando...`);
                retryCount++;
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                  // Usar datos del payload como fallback
                  orderDetails = {
                    ...data,
                    order_items: []
                  };
                }
              } else {
                orderDetails = data;
                break;
              }
            }

            if (!orderDetails) {
              console.error('No se pudieron obtener los detalles del pedido después de varios intentos');
              return;
            }

            console.log('✅ Notificación recibida - Order items:', orderDetails.order_items);

            // Actualizar estado de notificaciones
            setNotificationState(prev => ({
              ...prev,
              hasNewOrder: true,
              latestOrder: orderDetails as OrderNotification,
              orderCount: prev.orderCount + 1,
            }));

            // Reproducir sonido de notificación (si está disponible)
            playNotificationSound();

            // Mostrar notificación en el navegador
            showBrowserNotification(orderDetails);

          } catch (error) {
            console.error('Error procesando notificación:', error);
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
          // Pedido actualizado - payload no se usa actualmente
          // pero se mantiene para compatibilidad futura
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Reset reconnect attempts on successful connection
          reconnectAttemptRef.current = 0;
          setNotificationState(prev => ({
            ...prev,
            isConnected: true,
            connectionError: null,
            reconnectAttempt: 0,
            maxReconnectReached: false,
            isReconnecting: false,
          }));
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setNotificationState(prev => ({
            ...prev,
            isConnected: false,
            isReconnecting: false,
          }));
          isSubscribedRef.current = false;
          
          // Check if max reconnect attempts reached
          if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setNotificationState(prev => ({
              ...prev,
              maxReconnectReached: true,
              connectionError: `Máximo de intentos de reconexión alcanzado (${MAX_RECONNECT_ATTEMPTS}). Por favor, reconecta manualmente.`,
            }));
            return;
          }
          
          // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;
          
          setNotificationState(prev => ({
            ...prev,
            reconnectAttempt: reconnectAttemptRef.current,
            isReconnecting: true,
          }));
          
          // Intentar reconexión con backoff exponencial
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupSubscription();
          }, delay);
        } else if (status === 'TIMED_OUT') {
          setNotificationState(prev => ({
            ...prev,
            isConnected: false,
            connectionError: 'Connection timed out',
            isReconnecting: false,
          }));
          isSubscribedRef.current = false;
          
          // Check if max reconnect attempts reached
          if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setNotificationState(prev => ({
              ...prev,
              maxReconnectReached: true,
              connectionError: `Máximo de intentos de reconexión alcanzado (${MAX_RECONNECT_ATTEMPTS}). Por favor, reconecta manualmente.`,
            }));
            return;
          }
          
          // Calculate exponential backoff delay
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
          reconnectAttemptRef.current += 1;
          
          setNotificationState(prev => ({
            ...prev,
            reconnectAttempt: reconnectAttemptRef.current,
            isReconnecting: true,
          }));
          
          // Intentar reconexión con backoff exponencial
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            setupSubscription();
          }, delay);
        }

      });

    subscriptionRef.current = subscription;

    // Cleanup function
    return () => {
      isSubscribedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      try {
        subscription.unsubscribe();
      } catch (e) {
        // Ignore unsubscribe errors
      }
    };
  }, [businessId]);

  // Efecto para establecer la suscripción
  useEffect(() => {
    const cleanup = setupSubscription();

    return () => {
      if (cleanup) cleanup();
    };
  }, [setupSubscription, isAuthReady, businessId]);

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
  const reconnect = () => {
    reconnectAttemptRef.current = 0;
    isSubscribedRef.current = false;
    setNotificationState(prev => ({
      ...prev,
      reconnectAttempt: 0,
      maxReconnectReached: false,
      isReconnecting: true,
    }));
    setupSubscription();
  };


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
