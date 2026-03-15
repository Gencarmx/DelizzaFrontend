/**
 * Analytics Service - Métricas y análisis para restaurantes
 * Proporciona datos para dashboards y reportes
 */

import { supabase } from "@core/supabase/client";

export interface BusinessMetrics {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  pending_orders: number;
  completed_orders_today: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    total_sold: number;
    revenue: number;
  }>;
  revenue_by_period: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface CommissionData {
  period: string;
  total_orders: number;
  total_revenue: number;
  commission_amount: number;
  commission_rate: number;
  paid: boolean;
  paid_at?: string;
}

export interface CommissionSummary {
  current_month: CommissionData;
  last_month: CommissionData;
  total_pending: number;
  total_paid: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface DateRange {
  from: string;
  to: string;
}

/**
 * Obtiene métricas completas del restaurante para el dashboard
 */
export async function getBusinessMetrics(
  businessId: string,
  period: DateRange = getDefaultPeriod()
): Promise<BusinessMetrics> {
  try {
    // Obtener pedidos en el período
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, status, created_at')
      .eq('business_id', businessId)
      .gte('created_at', period.from)
      .lte('created_at', period.to);

    if (ordersError) throw ordersError;

    // Obtener productos más vendidos
    const { data: topProductsData, error: productsError } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        price,
        products!inner (
          name
        )
      `)
      .eq('orders.business_id', businessId)
      .gte('orders.created_at', period.from)
      .lte('orders.created_at', period.to);

    if (productsError) throw productsError;

    // Calcular métricas
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;

    // Pedidos completados hoy
    const today = new Date().toISOString().split('T')[0];
    const completedToday = orders?.filter(order =>
      order.status === 'completed' &&
      order.created_at.startsWith(today)
    ).length || 0;

    // Productos más vendidos
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

    topProductsData?.forEach((item: any) => {
      const productId = item.product_id;
      const existing = productSales.get(productId) || {
        name: (item.products as any)?.name || 'Producto desconocido',
        quantity: 0,
        revenue: 0
      };

      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;

      productSales.set(productId, existing);
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        product_id: productId,
        product_name: data.name,
        total_sold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Revenue por período (últimos 7 días)
    const revenueByPeriod = await getRevenueByPeriod(businessId, 7);

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      average_order_value: averageOrderValue,
      pending_orders: pendingOrders,
      completed_orders_today: completedToday,
      top_products: topProducts,
      revenue_by_period: revenueByPeriod
    };
  } catch (error) {
    console.error('Error obteniendo métricas del negocio:', error);
    throw new Error('No se pudieron obtener las métricas del negocio');
  }
}

/**
 * Obtiene datos para gráfico de ventas
 */
export async function getSalesChartData(
  businessId: string,
  period: 'week' | 'month' | 'year' = 'week'
): Promise<ChartData> {
  try {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;

    const { data, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .gte('created_at', getDateFromDaysAgo(days))
      .order('created_at');

    if (error) throw error;

    // Agrupar por día
    const dailyData = new Map<string, number>();

    data?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      dailyData.set(date, (dailyData.get(date) || 0) + order.total);
    });

    // Crear arrays para el gráfico
    const labels: string[] = [];
    const values: number[] = [];

    // Llenar datos para todos los días en el período
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      labels.push(formatDateLabel(date, period));
      values.push(dailyData.get(dateStr) || 0);
    }

    return {
      labels,
      datasets: [{
        label: 'Ventas Diarias',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
      }]
    };
  } catch (error) {
    console.error('Error obteniendo datos del gráfico de ventas:', error);
    throw new Error('No se pudieron obtener los datos del gráfico');
  }
}

/**
 * Obtiene productos más vendidos
 */
export async function getTopProducts(
  businessId: string,
  limit: number = 10
): Promise<Array<{
  product_id: string;
  product_name: string;
  total_sold: number;
  revenue: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        price,
        products!inner (
          name
        )
      `)
      .eq('orders.business_id', businessId)
      .eq('orders.status', 'completed');

    if (error) throw error;

    // Agrupar por producto
    const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();

    data?.forEach((item: any) => {
      const productId = item.product_id;
      const existing = productStats.get(productId) || {
        name: (item.products as any)?.name || 'Producto desconocido',
        quantity: 0,
        revenue: 0
      };

      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;

      productStats.set(productId, existing);
    });

    return Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        product_id: productId,
        product_name: stats.name,
        total_sold: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  } catch (error) {
    console.error('Error obteniendo productos más vendidos:', error);
    throw new Error('No se pudieron obtener los productos más vendidos');
  }
}

/**
 * Obtiene resumen de comisiones
 */
export async function getCommissionSummary(
  businessId: string
): Promise<CommissionSummary> {
  try {
    const commissionRate = parseFloat(import.meta.env.VITE_COMMISSION_RATE || '0.05');

    // Datos del mes actual
    const currentMonthData = await getCommissionData(businessId, getCurrentMonthRange(), commissionRate);

    // Datos del mes anterior
    const lastMonthData = await getCommissionData(businessId, getLastMonthRange(), commissionRate);

    // Totales pendientes y pagados (simplificado para MVP)
    const totalPending = currentMonthData.paid ? 0 : currentMonthData.commission_amount;
    const totalPaid = lastMonthData.paid ? lastMonthData.commission_amount : 0;

    return {
      current_month: currentMonthData,
      last_month: lastMonthData,
      total_pending: totalPending,
      total_paid: totalPaid
    };
  } catch (error) {
    console.error('Error obteniendo resumen de comisiones:', error);
    throw new Error('No se pudo obtener el resumen de comisiones');
  }
}

/**
 * Obtiene datos de comisión para un período específico
 */
async function getCommissionData(
  businessId: string,
  period: DateRange,
  commissionRate: number
): Promise<CommissionData> {
  const { data, error } = await supabase
    .from('orders')
    .select('total')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('created_at', period.from)
    .lte('created_at', period.to);

  if (error) throw error;

  const totalOrders = data?.length || 0;
  const totalRevenue = data?.reduce((sum, order) => sum + order.total, 0) || 0;
  const commissionAmount = totalRevenue * commissionRate;

  return {
    period: `${period.from} - ${period.to}`,
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    commission_amount: commissionAmount,
    commission_rate: commissionRate,
    paid: false, // En MVP, asumimos que no están pagadas
  };
}

/**
 * Obtiene revenue por período
 */
async function getRevenueByPeriod(
  businessId: string,
  days: number
): Promise<Array<{ date: string; revenue: number; orders: number }>> {
  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .gte('created_at', getDateFromDaysAgo(days));

  if (error) throw error;

  const dailyData = new Map<string, { revenue: number; orders: number }>();

  data?.forEach(order => {
    const date = new Date(order.created_at).toISOString().split('T')[0];
    const existing = dailyData.get(date) || { revenue: 0, orders: 0 };
    existing.revenue += order.total;
    existing.orders += 1;
    dailyData.set(date, existing);
  });

  const result: Array<{ date: string; revenue: number; orders: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const data = dailyData.get(dateStr) || { revenue: 0, orders: 0 };

    result.push({
      date: dateStr,
      revenue: data.revenue,
      orders: data.orders
    });
  }

  return result;
}

// Funciones auxiliares

function getDefaultPeriod(): DateRange {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    from: thirtyDaysAgo.toISOString(),
    to: now.toISOString()
  };
}

function getCurrentMonthRange(): DateRange {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: firstDay.toISOString(),
    to: lastDay.toISOString()
  };
}

function getLastMonthRange(): DateRange {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

  return {
    from: firstDay.toISOString(),
    to: lastDay.toISOString()
  };
}

function getDateFromDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function formatDateLabel(date: Date, period: 'week' | 'month' | 'year'): string {
  if (period === 'week') {
    return date.toLocaleDateString('es-ES', { weekday: 'short' });
  } else if (period === 'month') {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } else {
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  }
}
