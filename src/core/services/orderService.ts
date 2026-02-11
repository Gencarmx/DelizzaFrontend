/**
 * Order Service - Gestión completa de pedidos para restaurantes
 * Proporciona funcionalidades para gestionar pedidos y su ciclo de vida
 */

import { supabase } from "@core/supabase/client";
import type { Database } from "@core/supabase/types";

type Order = Database['public']['Tables']['orders']['Row'];
// type OrderInsert = Database['public']['Tables']['orders']['Insert']; // Not used currently
type OrderUpdate = Database['public']['Tables']['orders']['Update'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  customer_name?: string;
  customer?: {
    full_name: string;
    phone_number: string;
  };
}

/**
 * Helper function to safely extract customer_name from order data
 * Handles cases where Supabase returns the field with different casing or nesting
 */
function extractCustomerName(order: any): string | undefined {
  // Try different possible locations for customer_name
  if (order.customer_name) return order.customer_name;
  if (order.customerName) return order.customerName;
  if (order.customer?.full_name) return order.customer.full_name;
  if (order.customer?.name) return order.customer.name;
  
  // Check if it's in a nested structure
  const rawData = order as Record<string, any>;
  for (const key of Object.keys(rawData)) {
    if (key.toLowerCase().includes('customer') && typeof rawData[key] === 'string') {
      return rawData[key];
    }
  }
  
  return undefined;
}

export interface OrderFilters {
  business_id?: string;
  status?: OrderStatus;
  date_from?: string;
  date_to?: string;
  customer_id?: string;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
}

/**
 * Obtiene todos los pedidos de un restaurante con filtros opcionales
 */
export async function getOrdersByBusiness(
  businessId: string,
  filters?: OrderFilters
): Promise<OrderWithItems[]> {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });


    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as OrderWithItems[];

  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    throw new Error('No se pudieron obtener los pedidos');
  }
}

/**
 * Obtiene un pedido específico con detalles completos
 */
export async function getOrderDetails(orderId: string): Promise<OrderWithItems | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single();


    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }

    return data as OrderWithItems;

  } catch (error) {
    console.error('Error obteniendo detalles del pedido:', error);
    throw new Error('No se pudo obtener el detalle del pedido');
  }
}

/**
 * Actualiza el estado de un pedido
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes?: string
): Promise<Order> {
  try {
    // Validar estado
    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Estado de pedido inválido');
    }

    const updateData: OrderUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Si se cancela el pedido, podríamos agregar notas
    if (status === 'cancelled' && notes) {
      // Nota: La tabla orders no tiene campo para notas de cancelación
      // Podríamos agregarlo o usar un sistema de logs separado
      console.log(`Pedido ${orderId} cancelado. Notas: ${notes}`);
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`Estado del pedido ${orderId} actualizado a: ${status}`);
    return data;
  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al actualizar pedido');
  }
}

/**
 * Marca un pedido como pagado en efectivo
 */
export async function markOrderAsPaid(orderId: string): Promise<Order> {
  try {
    // Verificar que el pedido existe y está en estado válido
    const order = await getOrderDetails(orderId);
    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.status === 'cancelled') {
      throw new Error('No se puede marcar como pagado un pedido cancelado');
    }

    // Nota: La tabla payments existe, pero para MVP simplificado
    // podríamos solo actualizar el estado del pedido
    // En una implementación completa, crearíamos un registro en payments

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`Pedido ${orderId} marcado como pagado`);
    return data;
  } catch (error) {
    console.error('Error marcando pedido como pagado:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al marcar pedido como pagado');
  }
}

/**
 * Cancela un pedido
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  // cancelledBy?: string // Not used currently
): Promise<Order> {
  try {
    // Verificar que el pedido puede ser cancelado
    const order = await getOrderDetails(orderId);
    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.status === 'completed') {
      throw new Error('No se puede cancelar un pedido completado');
    }

    if (order.status === 'cancelled') {
      throw new Error('El pedido ya está cancelado');
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`Pedido ${orderId} cancelado. Razón: ${reason}`);
    return data;
  } catch (error) {
    console.error('Error cancelando pedido:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al cancelar pedido');
  }
}

/**
 * Obtiene estadísticas de pedidos de un restaurante
 */
export async function getOrderStats(
  businessId: string,
  period?: { from: string; to: string }
): Promise<OrderStats> {
  try {
    let query = supabase
      .from('orders')
      .select('status, total')
      .eq('business_id', businessId);

    if (period) {
      query = query
        .gte('created_at', period.from)
        .lte('created_at', period.to);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats: OrderStats = {
      total_orders: data.length,
      pending_orders: data.filter(o => o.status === 'pending').length,
      completed_orders: data.filter(o => o.status === 'completed').length,
      cancelled_orders: data.filter(o => o.status === 'cancelled').length,
      total_revenue: data
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total, 0)
    };

    return stats;
  } catch (error) {
    console.error('Error obteniendo estadísticas de pedidos:', error);
    throw new Error('No se pudieron obtener las estadísticas de pedidos');
  }
}

/**
 * Obtiene pedidos recientes para el dashboard
 */
export async function getRecentOrders(
  businessId: string,
  limit: number = 10
): Promise<OrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log('📦 getRecentOrders - Datos recibidos:', data);
    console.log('📦 getRecentOrders - Primer pedido:', data?.[0]);
    console.log('📦 getRecentOrders - Primer pedido customer_name:', data?.[0]?.customer_name);
    
    // Ensure customer_name is properly extracted and attached
    const processedData = (data || []).map(order => ({
      ...order,
      customer_name: extractCustomerName(order) || order.customer_name
    }));
    
    console.log('📦 getRecentOrders - Después de procesar, primer pedido customer_name:', processedData?.[0]?.customer_name);

    return processedData as OrderWithItems[];

  } catch (error) {
    console.error('Error obteniendo pedidos recientes:', error);
    throw new Error('No se pudieron obtener los pedidos recientes');
  }
}

/**
 * Obtiene pedidos por estado para el dashboard
 */
export async function getOrdersByStatus(
  businessId: string,
  status: OrderStatus
): Promise<OrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('business_id', businessId)
      .eq('status', status)
      .order('created_at', { ascending: false });


    if (error) throw error;

    return (data || []) as OrderWithItems[];

  } catch (error) {
    console.error('Error obteniendo pedidos por estado:', error);
    throw new Error('No se pudieron obtener los pedidos por estado');
  }
}

/**
 * Obtiene los pedidos del usuario actual (cliente)
 */
export async function getOrdersByCustomer(
  customerId: string,
  limit: number = 20
): Promise<OrderWithItems[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        businesses:business_id (
          name
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(order => ({
      ...order,
      business_name: order.businesses?.name
    })) as OrderWithItems[];
  } catch (error) {
    console.error('Error obteniendo pedidos del cliente:', error);
    throw new Error('No se pudieron obtener tus pedidos');
  }
}

/**
 * Verifica si un usuario puede gestionar un pedido
 */
export async function canUserManageOrder(
  userId: string,
  orderId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        business_id,
        businesses!inner(owner_id)
      `)
      .eq('id', orderId)
      .eq('businesses.owner_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // No encontrado
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error verificando permisos del pedido:', error);
    return false;
  }
}
