import { supabase } from "@core/supabase/client";
import type { CartOrder } from "@core/context/CartContext";

/**
 * Obtiene el profile.id y nombre del usuario autenticado
 */
async function getUserProfile(): Promise<{ id: string; full_name: string } | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) return null;
  return profile;
}

export interface CheckoutData {
  deliveryOption: {
    type: "pickup" | "delivery";
    address?: string;
    addressId?: string;
    distance?: number;
  };
  paymentMethod: string;
  specialInstructions?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  restaurantName: string;
  /** ID del restaurante — se usa para limpiar el carrito por restaurante.
   *  Más confiable que buscar por nombre (dos restaurantes podrían tener el mismo). */
  restaurantId: string;
  total: number;
  error?: string;
}

/**
 * Valida que un ID sea un UUID válido
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Procesa múltiples pedidos de diferentes restaurantes
 * Similar al enfoque de Uber Eats
 */
export async function processMultiRestaurantCheckout(
  orders: CartOrder[],
  checkoutData: CheckoutData,
  deliveryTypeByRestaurant?: Record<string, 'pickup' | 'delivery'>
): Promise<OrderResult[]> {
  const results: OrderResult[] = [];

  // Validar que hay órdenes para procesar
  if (!orders || orders.length === 0) {
    return [{
      success: false,
      restaurantName: 'Carrito vacío',
      restaurantId: '',
      total: 0,
      error: 'No hay productos en el carrito para procesar'
    }];
  }

  for (const order of orders) {
    try {
      if (!order.restaurant?.id || order.restaurant.id === 'unknown' || !isValidUUID(order.restaurant.id)) {
        console.error('ID de restaurante inválido:', order.restaurant?.id);
        results.push({
          success: false,
          restaurantName: order.restaurant?.name || 'Restaurante desconocido',
          restaurantId: order.restaurant?.id || '',
          total: order.total,
          error: 'ID de restaurante inválido. Por favor, elimina los productos de este restaurante y agrégalos nuevamente.'
        });
        continue;
      }

      // Usar el tipo de entrega específico del restaurante si está disponible
      const orderDeliveryType =
        deliveryTypeByRestaurant?.[order.restaurant.id] ?? checkoutData.deliveryOption.type;

      const orderCheckoutData: CheckoutData = {
        ...checkoutData,
        deliveryOption: {
          ...checkoutData.deliveryOption,
          type: orderDeliveryType,
        },
      };

      const validation = await validateOrderItems(order, orderDeliveryType);
      if (!validation.valid) {
        results.push({
          success: false,
          restaurantName: order.restaurant.name,
          restaurantId: order.restaurant.id,
          total: order.total,
          error: validation.errors.join('. '),
        });
        continue;
      }

      const result = await createRestaurantOrder(order, orderCheckoutData);
      results.push(result);
    } catch (error) {
      console.error(`Error procesando pedido para ${order.restaurant.name}:`, error);
      results.push({
        success: false,
        restaurantName: order.restaurant.name,
        restaurantId: order.restaurant.id,
        total: order.total,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  return results;
}

/**
 * Crea un pedido individual para un restaurante
 */
async function createRestaurantOrder(
  order: CartOrder,
  checkoutData: CheckoutData
): Promise<OrderResult> {
  try {
    // 1. Obtener el profile.id y nombre del usuario
    const customerProfile = await getUserProfile();
    if (!customerProfile) {
      throw new Error('Usuario no autenticado o perfil no encontrado');
    }

    // Validar que el business_id sea un UUID válido antes de enviarlo
    if (!isValidUUID(order.restaurant.id)) {
      throw new Error(`ID de restaurante inválido: ${order.restaurant.id}`);
    }

    // 2. Crear la orden y sus items en una sola transacción atómica (RC1 fix).
    // El stored procedure create_order_with_items hace BEGIN/COMMIT en PostgreSQL,
    // eliminando la condición de carrera del rollback manual previo.
    const orderItems = order.items.map(item => ({
      // Usar productId (UUID real) si existe; item.id puede ser un composite key
      product_id: item.productId ?? item.id,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
      // Detalles de extras para tickets de cocina (columna addons en order_items)
      addons: item.selectedAddons && item.selectedAddons.length > 0
        ? item.selectedAddons
            .filter(a => a.quantity > 0)
            .map(a => ({ name: a.name, price: a.price, quantity: a.quantity }))
        : null,
    }));

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'create_order_with_items',
      {
        p_business_id:    order.restaurant.id,
        p_customer_id:    customerProfile.id,
        p_customer_name:  customerProfile.full_name || 'Cliente',
        p_total:          order.total,
        p_delivery_type:  checkoutData.deliveryOption.type,
        p_payment_method: checkoutData.paymentMethod,
        p_items:          orderItems,
      }
    );

    if (rpcError) throw rpcError;

    const orderId: string = rpcData.order_id;
    const orderCreatedAt: string = rpcData.created_at ?? new Date().toISOString();

    // 3. Aquí iría la integración con MercadoPago
    // await processPayment(orderId, order.total, checkoutData.paymentMethod);

    // 4. Notificar al restaurante sobre el nuevo pedido vía Broadcast
    await notifyRestaurant(orderId, {
      business_id: order.restaurant.id,
      customer_name: customerProfile.full_name || 'Cliente',
      total: order.total,
      delivery_type: checkoutData.deliveryOption.type,
      created_at: orderCreatedAt,
      order_items: order.items.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        addons: item.selectedAddons && item.selectedAddons.length > 0
          ? item.selectedAddons
              .filter(a => a.quantity > 0)
              .map(a => `${a.name}${a.quantity > 1 ? ` x${a.quantity}` : ''}`)
              .join(', ')
          : undefined,
      })),
    });

    // 5. Push notification al owner — funciona aunque el browser esté cerrado
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('profiles!inner(user_id)')
        .eq('id', order.restaurant.id)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ownerUserId = (business as any)?.profiles?.user_id as string | undefined;

      if (ownerUserId) {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            targetUserId: ownerUserId,
            title: '🛵 ¡Nuevo pedido!',
            body: `${customerProfile.full_name || 'Cliente'} — $${order.total.toFixed(2)}`,
            url: '/restaurant/orders',
            type: 'new_order',
          },
        });
      }
    } catch {
      // No interrumpir el flujo del pedido si falla la push
    }

    return {
      success: true,
      orderId: orderId,
      restaurantName: order.restaurant.name,
      restaurantId: order.restaurant.id,
      total: order.total
    };

  } catch (error) {
    console.error('Error creando pedido:', error);
    throw error;
  }
}

/**
 * Simula el procesamiento de pago (reemplazar con integración real)
 */
export async function processPayment(
  orderId: string,
  amount: number,
  paymentMethod: string
): Promise<boolean> {
  // TODO: Integrar con MercadoPago/Stripe
  console.log(`Procesando pago de $${amount} para orden ${orderId} con ${paymentMethod}`);

  // Simulación de procesamiento
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true); // Simular pago exitoso
    }, 2000);
  });
}

/**
 * Notifica al restaurante de un nuevo pedido usando Supabase Broadcast.
 * Broadcast no requiere RLS, por lo que siempre se entrega al canal destino.
 *
 * El canal temporal se limpia con un timeout de seguridad para evitar canales
 * zombie si la suscripción nunca alcanza el estado SUBSCRIBED (error de red,
 * timeout del servidor, etc.).
 */
export async function notifyRestaurant(orderId: string, orderData?: {
  business_id: string;
  customer_name: string;
  total: number;
  delivery_type: string;
  order_items: Array<{ product_name: string; quantity: number; price: number; addons?: string }>;
  created_at?: string;
}): Promise<void> {
  if (!orderData) return;

  const CHANNEL_TIMEOUT_MS = 8000; // Máximo tiempo de espera para el canal

  try {
    // Usar el mismo nombre de canal que escucha useRealtimeNotifications
    const channel = supabase.channel(`restaurant_orders_${orderData.business_id}`, {
      config: { broadcast: { ack: true } },
    });

    // Timeout de seguridad: si el canal nunca llega a SUBSCRIBED (error de red,
    // servidor no disponible), lo removemos para evitar canales zombie.
    const safetyTimer = setTimeout(async () => {
      console.warn('[notifyRestaurant] Timeout esperando SUBSCRIBED — limpiando canal');
      try { await supabase.removeChannel(channel); } catch { /* ignorar */ }
    }, CHANNEL_TIMEOUT_MS);

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(safetyTimer);
        const resp = await channel.send({
          type: 'broadcast',
          event: 'new_order',
          payload: {
            id: orderId,
            business_id: orderData.business_id,
            customer_name: orderData.customer_name,
            total: orderData.total,
            delivery_type: orderData.delivery_type,
            status: 'pending',
            created_at: orderData.created_at || new Date().toISOString(),
            order_items: orderData.order_items,
          },
        });
        console.log("[notifyRestaurant] Broadcast sent response:", resp);

        // Limpiar el canal temporal (el del restaurante tiene su propio canal persistente)
        try { await supabase.removeChannel(channel); } catch { /* ignorar */ }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(safetyTimer);
        try { await supabase.removeChannel(channel); } catch { /* ignorar */ }
      }
    });
  } catch (err) {
    // No interrumpir el flujo del pedido si falla la notificación
    console.warn('[notifyRestaurant] Error en la suscripcion para broadcast:', err);
  }
}

/**
 * Valida que el restaurante esté disponible y que la opción de entrega sea válida
 */
export async function validateOrderItems(
  order: CartOrder,
  deliveryType: 'pickup' | 'delivery'
): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  const { data: business } = await supabase
    .from('businesses')
    .select('active, is_paused, has_delivery, has_pickup, min_order_amount')
    .eq('id', order.restaurant.id)
    .maybeSingle();

  if (!business) {
    errors.push(`No se encontró el restaurante "${order.restaurant.name}"`);
  } else {
    if (!business.active) {
      errors.push(`El restaurante "${order.restaurant.name}" está desactivado`);
    }
    if (business.is_paused) {
      errors.push(`El restaurante "${order.restaurant.name}" no está recibiendo pedidos`);
    }
    if (deliveryType === 'delivery' && !business.has_delivery) {
      errors.push(`El restaurante "${order.restaurant.name}" no ofrece servicio a domicilio`);
    }
    if (deliveryType === 'pickup' && !business.has_pickup) {
      errors.push(`El restaurante "${order.restaurant.name}" no acepta retiro en tienda`);
    }
    if (business.min_order_amount > 0 && order.subtotal < business.min_order_amount) {
      errors.push(
        `El pedido mínimo de "${order.restaurant.name}" es $${business.min_order_amount.toFixed(2)}. Tu pedido es $${order.subtotal.toFixed(2)}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cancela pedidos si hay errores en el proceso
 */
export async function cancelOrders(orderIds: string[]): Promise<void> {
  for (const orderId of orderIds) {
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);
  }
}
