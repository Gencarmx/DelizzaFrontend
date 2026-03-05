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
  checkoutData: CheckoutData
): Promise<OrderResult[]> {
  const results: OrderResult[] = [];

  // Validar que hay órdenes para procesar
  if (!orders || orders.length === 0) {
    return [{
      success: false,
      restaurantName: 'Carrito vacío',
      total: 0,
      error: 'No hay productos en el carrito para procesar'
    }];
  }

  // Procesar cada pedido por restaurante por separado
  for (const order of orders) {
    try {
      // Validar que el restaurante tenga un ID válido
      if (!order.restaurant?.id || order.restaurant.id === 'unknown' || !isValidUUID(order.restaurant.id)) {
        console.error('ID de restaurante inválido:', order.restaurant?.id);
        results.push({
          success: false,
          restaurantName: order.restaurant?.name || 'Restaurante desconocido',
          total: order.total,
          error: 'ID de restaurante inválido. Por favor, elimina los productos de este restaurante y agrégalos nuevamente.'
        });
        continue;
      }

      const result = await createRestaurantOrder(order, checkoutData);
      results.push(result);
    } catch (error) {
      console.error(`Error procesando pedido para ${order.restaurant.name}:`, error);
      results.push({
        success: false,
        restaurantName: order.restaurant.name,
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

    // 2. Crear el pedido en la base de datos
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        business_id: order.restaurant.id,
        customer_id: customerProfile.id,
        customer_name: customerProfile.full_name || 'Cliente',
        status: 'pending',
        total: order.total,
        delivery_type: checkoutData.deliveryOption.type,
        payment_method: checkoutData.paymentMethod,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Crear los items del pedido
    const orderItems = order.items.map(item => ({
      order_id: orderData.id,
      product_id: item.id,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    // 4. Si falla la creación de items, cancelar la orden (rollback manual)
    if (itemsError) {
      console.error('Error creando items del pedido, cancelando orden:', itemsError);

      // Cancelar la orden creada
      await supabase
        .from('orders')
        .update({ status: 'cancelled', cancelled_reason: 'Error al crear items del pedido' })
        .eq('id', orderData.id);

      throw new Error(`Error al crear los items del pedido: ${itemsError.message}`);
    }


    // 3. Aquí iría la integración con MercadoPago
    // await processPayment(orderData.id, order.total, checkoutData.paymentMethod);

    // 4. Notificar al restaurante sobre el nuevo pedido vía Broadcast
    await notifyRestaurant(orderData.id, {
      business_id: order.restaurant.id,
      customer_name: customerProfile.full_name || 'Cliente',
      total: order.total,
      delivery_type: checkoutData.deliveryOption.type,
      created_at: orderData.created_at,
      order_items: order.items.map(item => ({
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    return {
      success: true,
      orderId: orderData.id,
      restaurantName: order.restaurant.name,
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
 */
export async function notifyRestaurant(orderId: string, orderData?: {
  business_id: string;
  customer_name: string;
  total: number;
  delivery_type: string;
  order_items: Array<{ product_name: string; quantity: number; price: number }>;
  created_at?: string;
}): Promise<void> {
  if (!orderData) return;

  try {
    // Usar el mismo nombre de canal que escucha useRealtimeNotifications
    const channel = supabase.channel(`restaurant_orders_${orderData.business_id}`, {
      config: { broadcast: { ack: true } },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
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
        await supabase.removeChannel(channel);
      }
    });
  } catch (err) {
    // No interrumpir el flujo del pedido si falla la notificación
    console.warn('[notifyRestaurant] Error en la suscripcion para broadcast:', err);
  }
}

/**
 * Valida que todos los productos estén disponibles
 */
export async function validateOrderItems(_order: CartOrder): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // TODO: Verificar stock disponible
  // TODO: Verificar precios no hayan cambiado
  // TODO: Verificar restaurante esté activo

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
