import { useState, useEffect } from "react";
import { Search, Filter, Eye, Loader2, Wifi, WifiOff } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { getRecentOrders } from "@core/services/orderService";
import type { Column } from "@components/restaurant-ui/tables/DataTable";


interface Order {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "in_progress";
  date: string;
  paymentMethod: string;
}

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Obtener notificaciones en tiempo real y estado de conexión
  const { 
    hasNewOrder, 
    latestOrder, 
    isConnected, 
    businessId,
    markAsRead 
  } = useRestaurantNotifications();

  // Cargar pedidos iniciales
  useEffect(() => {
    const loadOrders = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const ordersData = await getRecentOrders(businessId, 50); // Cargar más pedidos
        
        const formattedOrders: Order[] = ordersData.map(order => ({
          id: order.id.slice(-8).toUpperCase(), // Mostrar últimos 8 caracteres
          customer: order.customer_name || 'Cliente',
          items: order.order_items?.map(item => 
            `${item.quantity}x ${item.product_name || 'Producto'}`
          ).join(', ') || 'Sin items',

          total: order.total,
          status: mapOrderStatus(order.status || 'pending'),
          date: order.created_at 
            ? new Date(order.created_at).toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Sin fecha',
          paymentMethod: order.payment_method || 'No especificado',
        }));
        
        setOrders(formattedOrders);
      } catch (error) {
        console.error('Error cargando pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [businessId]);

  // Escuchar nuevos pedidos en tiempo real
  useEffect(() => {
    if (hasNewOrder && latestOrder && businessId) {
      // Recargar la lista de pedidos cuando llegue uno nuevo
      const reloadOrders = async () => {
        try {
          const ordersData = await getRecentOrders(businessId, 50);
          
          const formattedOrders: Order[] = ordersData.map(order => ({
            id: order.id.slice(-8).toUpperCase(),
            customer: order.customer_name || 'Cliente',
            items: order.order_items?.map(item => 
              `${item.quantity}x ${item.product_name || 'Producto'}`
            ).join(', ') || 'Sin items',

            total: order.total,
            status: mapOrderStatus(order.status || 'pending'),
            date: order.created_at 
              ? new Date(order.created_at).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Sin fecha',
            paymentMethod: order.payment_method || 'No especificado',
          }));
          
          setOrders(formattedOrders);
          markAsRead(); // Marcar como leída la notificación
        } catch (error) {
          console.error('Error recargando pedidos:', error);
        }
      };
      
      reloadOrders();
    }
  }, [hasNewOrder, latestOrder, businessId, markAsRead]);

  // Función para mapear estados de orden
  function mapOrderStatus(status: string): Order['status'] {
    switch (status) {
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


  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Order>[] = [
    {
      key: "customer",
      header: "Cliente",
      width: "200px",
      render: (order) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white text-base">
            {order.customer}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {order.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "items",
      header: "Detalle del pedido",
      render: (order) => (
        <div className="flex flex-col gap-1">
          {order.items.split(', ').map((item, index) => {
            const match = item.match(/(\d+)x\s(.+)/);
            if (match) {
              const [, quantity, productName] = match;
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {quantity}x
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {productName}
                  </span>
                </div>
              );
            }
            return (
              <span key={index} className="text-gray-600 dark:text-gray-400 text-sm">
                {item}
              </span>
            );
          })}
        </div>
      ),
    },

    {
      key: "total",
      header: "Total",
      width: "100px",
      render: (order) => (
        <span className="font-bold text-gray-900 dark:text-white">
          ${order.total}
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
      header: "Fecha",
      width: "150px",
      render: (order) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {order.date}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "80px",
      render: () => (
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <Eye className="w-5 h-5" />
        </button>
      ),
    },

  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pedidos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los pedidos de tu restaurante
          </p>
        </div>
        
        {/* Indicador de conexión Realtime */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <Wifi className="w-4 h-4" />
              <span>En vivo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
              <WifiOff className="w-4 h-4" />
              <span>Desconectado</span>
            </div>
          )}
        </div>
      </div>


      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por ID o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <select
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En preparación</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando pedidos...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredOrders}
            keyExtractor={(order) => order.id}
            emptyMessage="No se encontraron pedidos"
          />
        )}
      </div>

    </div>
  );
}
