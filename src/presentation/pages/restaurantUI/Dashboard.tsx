import { DollarSign, ShoppingBag, Users, TrendingUp, Loader2, Wifi, WifiOff, RefreshCw, AlertTriangle, PauseCircle } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import MetricCard from "@components/restaurant-ui/cards/MetricCard";
import SalesLineChart from "@components/restaurant-ui/charts/SalesLineChart";
import ProductsBarChart from "@components/restaurant-ui/charts/ProductsBarChart";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { getBusinessMetrics, getSalesChartData, getTopProducts } from "@core/services/analyticsService";
import { getRecentOrders } from "@core/services/orderService";
import { setBusinessPaused, getBusinessPausedState } from "@core/services/businessService";
import type { Column } from "@components/restaurant-ui/tables/DataTable";

interface Order {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "active" | "inactive" | "in_progress";
  date: string;
}

// Función para mapear estados de orden a los soportados por StatusBadge
function mapOrderStatus(orderStatus: string): Order['status'] {
  switch (orderStatus) {
    case 'pending':
      return 'pending';
    case 'confirmed':
    case 'preparing':
      return 'in_progress';
    case 'ready':
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export default function Dashboard() {
  const {
    hasNewOrder,
    latestOrder,
    isConnected,
    connectionError,
    reconnect,
    businessId,
    reconnectAttempt,
    maxReconnectReached,
    isReconnecting,
    markAsRead
  } = useRestaurantNotifications();


  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);

  // — Modo Hibernación —
  const [isPaused, setIsPaused] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseToast, setPauseToast] = useState<string | null>(null);

  // Cargar estado inicial de is_paused desde la BD
  useEffect(() => {
    if (!businessId) return;
    getBusinessPausedState(businessId).then((paused) => {
      if (paused !== null) setIsPaused(paused);
    });
  }, [businessId]);

  const handleTogglePause = async () => {
    if (!businessId || pauseLoading) return;
    const newPaused = !isPaused;
    // Optimistic UI — actualizar UI antes de la respuesta
    setIsPaused(newPaused);
    setPauseLoading(true);
    try {
      await setBusinessPaused(businessId, newPaused);
      setPauseToast(
        newPaused
          ? 'Modo hibernación activado. Los clientes no podrán realizar nuevos pedidos.'
          : 'Modo hibernación desactivado. El restaurante acepta pedidos normalmente.'
      );
    } catch {
      // Revertir en caso de error
      setIsPaused(!newPaused);
      setPauseToast('No se pudo cambiar el modo. Inténtalo de nuevo.');
    } finally {
      setPauseLoading(false);
      setTimeout(() => setPauseToast(null), 4000);
    }
  };

  const [salesData, setSalesData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [hasData, setHasData] = useState(false);

  // Cargar datos cuando tenemos businessId.
  // Usa `cancelled` local en lugar de isMounted ref para evitar que
  // re-renders de StrictMode o desmontajes intermedios dejen loading=true.
  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;
    setLoading(true);

    // Safety net: si el fetch no termina en 8s, salir del spinner.
    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const run = async () => {
      try {
        const [businessMetrics, chartData, topProducts, orders] = await Promise.all([
          getBusinessMetrics(businessId),
          getSalesChartData(businessId, 'week'),
          getTopProducts(businessId, 5),
          getRecentOrders(businessId, 5),
        ]);

        if (cancelled) return;

        setMetrics([
          {
            title: "Ventas del día",
            value: `$${businessMetrics.completed_orders_today * businessMetrics.average_order_value || 0}`,
            icon: <DollarSign className="w-6 h-6 text-amber-600" />,
            trend: { value: 0, isPositive: true },
            subtitle: "Hoy",
          },
          {
            title: "Pedidos totales",
            value: businessMetrics.total_orders.toString(),
            icon: <ShoppingBag className="w-6 h-6 text-amber-600" />,
            trend: { value: 0, isPositive: true },
            subtitle: "Este mes",
          },
          {
            title: "Pedidos pendientes",
            value: businessMetrics.pending_orders.toString(),
            icon: <Users className="w-6 h-6 text-amber-600" />,
            trend: { value: 0, isPositive: false },
            subtitle: "Requieren atención",
          },
          {
            title: "Ticket promedio",
            value: `$${businessMetrics.average_order_value.toFixed(0)}`,
            icon: <TrendingUp className="w-6 h-6 text-amber-600" />,
            trend: { value: 0, isPositive: true },
            subtitle: "Por pedido",
          },
        ]);

        setSalesData(chartData.datasets[0]?.data.map((value, index) => ({
          date: chartData.labels[index],
          sales: value
        })) || []);

        setProductsData(topProducts.map(product => ({
          name: product.product_name,
          sales: product.total_sold
        })));

        const formattedOrders: Order[] = orders.map((order) => ({
          id: order.id,
          customer: order.customer_name || 'Cliente',
          items: order.order_items?.map(item => `${item.quantity}x ${item.product_name || 'Producto'}`).join(', ') || 'Productos varios',
          total: order.total,
          status: mapOrderStatus(order.status || 'pending'),
          date: order.created_at ? new Date(order.created_at).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Sin fecha'
        }));
        setRecentOrders(formattedOrders);

        setHasData(businessMetrics.total_orders > 0 || formattedOrders.length > 0);
      } catch {
        if (cancelled) return;
        setMetrics([
          { title: "Ventas del día",      value: "$0", icon: <DollarSign className="w-6 h-6 text-amber-600" />, trend: { value: 0, isPositive: true },  subtitle: "Sin datos" },
          { title: "Pedidos totales",     value: "0",  icon: <ShoppingBag className="w-6 h-6 text-amber-600" />, trend: { value: 0, isPositive: true },  subtitle: "Este mes" },
          { title: "Pedidos pendientes",  value: "0",  icon: <Users className="w-6 h-6 text-amber-600" />,       trend: { value: 0, isPositive: false }, subtitle: "Requieren atención" },
          { title: "Ticket promedio",     value: "$0", icon: <TrendingUp className="w-6 h-6 text-amber-600" />,  trend: { value: 0, isPositive: true },  subtitle: "Por pedido" },
        ]);
        setHasData(false);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    run();

    // El cleanup marca esta ejecución como obsoleta y limpia el timeout.
    // Funciona correctamente con React StrictMode (double-invoke) y con
    // cambios reales de businessId (navegación).
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [businessId]);

  // Track processed order IDs to avoid duplicates
  const processedOrderIds = useRef<Set<string>>(new Set());

  // React immediately to new order – prepend to list without a full refetch
  useEffect(() => {
    if (!hasNewOrder || !latestOrder || !businessId) return;
    if (processedOrderIds.current.has(latestOrder.id)) return;

    processedOrderIds.current.add(latestOrder.id);

    const newOrder: Order = {
      id: latestOrder.id,
      customer: latestOrder.customer_name || 'Cliente',
      items: latestOrder.order_items?.map(
        (item: { quantity: number; product_name: string }) =>
          `${item.quantity}x ${item.product_name || 'Producto'}`
      ).join(', ') || 'Productos varios',
      total: latestOrder.total,
      status: mapOrderStatus(latestOrder.status || 'pending'),
      date: latestOrder.created_at
        ? new Date(latestOrder.created_at).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
        : 'Ahora',
    };

    setRecentOrders(prev => {
      if (prev.some(o => o.id === latestOrder.id)) return prev;
      // Keep only last 5 entries
      return [newOrder, ...prev].slice(0, 5);
    });

    markAsRead();
  }, [hasNewOrder, latestOrder, businessId, markAsRead]);





  const orderColumns: Column<Order>[] = [
    {
      key: "id",
      header: "ID Pedido",
      width: "120px",
      render: (order) => (
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          {order.id.slice(-8)}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (order) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {order.customer}
        </span>
      ),
    },

    {
      key: "items",
      header: "Productos",
      render: (order) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {order.items}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "100px",
      render: (order) => (
        <span className="font-bold text-gray-900 dark:text-white">
          ${order.total.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "130px",
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "date",
      header: "Hora",
      width: "100px",
      render: (order) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {order.date}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Cargando datos del restaurante...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      </div>
    );
  }

  // Si no hay businessId, mostrar mensaje de error
  if (!businessId) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Resumen de tu restaurante en tiempo real
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                No se encontró restaurante asociado
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                Tu cuenta de owner no tiene un restaurante asignado. Por favor, contacta al administrador o completa el registro de tu restaurante.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">



      {/* Header con indicador de conexión */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Resumen de tu restaurante en tiempo real
          </p>
        </div>

        {/* Indicador de estado de conexión mejorado */}
        <div className="flex flex-col items-end gap-2">
          {isConnected ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                <Wifi className="w-4 h-4" />
                <span>Conectado</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 mt-1">
                Recibiendo notificaciones en tiempo real
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                  <WifiOff className="w-4 h-4" />
                  <span>Sin conexión</span>
                </div>
                {maxReconnectReached ? (
                  <button
                    onClick={reconnect}
                    className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                    title="Reconectar manualmente"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                ) : isReconnecting ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Intento {reconnectAttempt}/5
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Mensaje de estado de conexión más visible */}
              <div className="mt-2 text-right">
                {maxReconnectReached ? (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Máximo de intentos alcanzado
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Haz clic en el botón para reconectar manualmente
                    </span>
                  </div>
                ) : isReconnecting ? (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Reconectando automáticamente...
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Esperando conexión con el servidor
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      No se están recibiendo notificaciones
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Intentando reconectar...
                    </span>
                  </div>
                )}
              </div>

              {connectionError && !maxReconnectReached && (
                <span className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-[200px] text-right">
                  {connectionError}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modo Hibernación — Toggle de acceso rápido */}
      <div className={`rounded-2xl border p-4 transition-colors ${
        isPaused
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <PauseCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isPaused ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
            }`} />
            <div>
              <p className={`text-sm font-semibold ${
                isPaused ? 'text-amber-800 dark:text-amber-300' : 'text-gray-800 dark:text-gray-200'
              }`}>
                Modo Hibernación
              </p>
              <p className={`text-xs mt-0.5 ${
                isPaused ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {isPaused
                  ? 'Activado — los clientes no pueden realizar nuevos pedidos'
                  : 'Al activarlo, los clientes verán tu restaurante pero no podrán realizar nuevos pedidos'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePause}
            disabled={pauseLoading}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
              isPaused ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
            } ${pauseLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={isPaused ? 'Desactivar modo hibernación' : 'Activar modo hibernación'}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              isPaused ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* Toast de confirmación del modo hibernación */}
      {pauseToast && (
        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-4 py-3 rounded-xl shadow-lg animate-slide-in">
          {pauseToast}
        </div>
      )}

      {!hasData && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                No se encontraron datos relevantes
              </h3>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Tu restaurante aún no tiene pedidos, ventas o productos registrados. Comienza agregando productos y recibiendo pedidos para ver métricas aquí.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesLineChart data={salesData} title="Ventas de la semana" />
        <ProductsBarChart data={productsData} title="Productos más vendidos" />
      </div>

      {/* Recent Orders */}
      <div className="pb-24 md:pb-28">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Pedidos recientes
        </h2>
        <DataTable
          columns={orderColumns}
          data={recentOrders}
          keyExtractor={(order) => `${order.id}-${order.date}-${order.total}`}
          emptyMessage="No hay pedidos recientes"
        />
      </div>



      {/* Estilos para animaciones */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
