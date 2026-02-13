import { useState, useEffect } from "react";
import { Search, Filter, Eye, Loader2, Wifi, WifiOff, ChefHat, Package, X } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { getRecentOrders, updateOrderStatus } from "@core/services/orderService";
import { getBusinessById } from "@core/services/businessService";
import { PrintButton } from "@presentation/components/printing";
import type { Column } from "@components/restaurant-ui/tables/DataTable";


interface Order {
  id: string;
  fullId: string; // ID completo para operaciones de base de datos
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "in_progress" | "ready" | "preparing";
  date: string;
  paymentMethod: string;
  originalStatus?: string;
}

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    address: string;
    phone: string;
  } | null>(null);
  
  // Obtener notificaciones en tiempo real y estado de conexión
  const { 
    hasNewOrder, 
    latestOrder, 
    isConnected, 
    businessId,
    markAsRead 
  } = useRestaurantNotifications();

  // Cargar información del negocio cuando cambia el businessId
  useEffect(() => {
    const loadBusinessInfo = async () => {
      if (!businessId) {
        setBusinessInfo(null);
        return;
      }

      try {
        const business = await getBusinessById(businessId);
        if (business) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const businessData = business as any;
          setBusinessInfo({
            name: business.name || "Mi Restaurante",
            address: business.address || "Dirección del restaurante",
            phone: businessData.phone_number || business.profile?.phone_number || "Teléfono",
          });
        }
      } catch (error) {
        console.error('Error cargando información del negocio:', error);
        setBusinessInfo(null);
      }
    };

    loadBusinessInfo();
  }, [businessId]);

  // Función para actualizar el estado de un pedido
  const handleStatusChange = async (fullId: string, displayId: string, newStatus: string) => {
    if (!fullId || fullId === 'undefined') {
      console.error('❌ Error: fullId es undefined o inválido');
      return;
    }
    
    try {
      setUpdatingOrders(prev => new Set(prev).add(displayId));
      await updateOrderStatus(fullId, newStatus as any);
      
      // Actualizar el estado local
      setOrders(prev => prev.map(order => 
        order.fullId === fullId 
          ? { ...order, status: mapOrderStatus(newStatus) }
          : order
      ));
    } catch (error) {
      console.error('Error actualizando estado:', error);
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(displayId);
        return newSet;
      });
    }
  };

  // Cargar pedidos iniciales
  useEffect(() => {
    const loadOrders = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const ordersData = await getRecentOrders(businessId, 50);
        
        const formattedOrders: Order[] = ordersData.map(order => {
          const formattedOrder = {
            id: order.id.slice(-8).toUpperCase(),
            fullId: order.id, // Guardar el ID completo
            customer: order.customer_name || 'Cliente',
            items: order.order_items?.map(item => 
              `${item.quantity}x ${item.product_name || 'Producto'}`
            ).join(', ') || 'Sin items',
            total: order.total,
            status: mapOrderStatus(order.status || 'pending'),
            originalStatus: order.status || undefined,
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
          };

          return formattedOrder;
        });
        
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
      const reloadOrders = async () => {
        try {
          const ordersData = await getRecentOrders(businessId, 50);
          
          const formattedOrders: Order[] = ordersData.map(order => {
            const formattedOrder = {
              id: order.id.slice(-8).toUpperCase(),
              fullId: order.id, // Guardar el ID completo
              customer: order.customer_name || 'Cliente',
              items: order.order_items?.map(item => 
                `${item.quantity}x ${item.product_name || 'Producto'}`
              ).join(', ') || 'Sin items',
              total: order.total,
              status: mapOrderStatus(order.status || 'pending'),
              originalStatus: order.status || undefined,
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
            };
            
            return formattedOrder;
          });
          
          setOrders(formattedOrders);
          markAsRead();
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
        return 'preparing';
      case 'ready':
        return 'ready';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  // Determina qué acciones mostrar según el estado
  const getActionsForStatus = (order: Order) => {
    const { status } = order;
    const isUpdating = updatingOrders.has(order.id);
    
    // Debug: verificar que fullId existe
    if (!order.fullId) {
      console.error('❌ Error: order.fullId es undefined para el pedido:', order);
    }
    
    // No mostrar acciones si está completado o cancelado
    if (status === 'completed' || status === 'cancelled') {
      return (
        <div className="flex items-center gap-1">
        {/* Botón: Imprimir ticket */}
        <PrintButton 
          order={order} 
          variant="icon"
          businessName={businessInfo?.name || "Mi Restaurante"}
          businessAddress={businessInfo?.address || "Dirección del restaurante"}
          businessPhone={businessInfo?.phone || "Teléfono"}
        />
          
          {/* Botón: Ver detalles - siempre visible */}
          <button
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Ver detalles"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {/* Botón: En preparación (ChefHat) - visible cuando está pendiente */}
        {status === 'pending' && (
          <button
            onClick={() => handleStatusChange(order.fullId, order.id, 'preparing')}
            disabled={isUpdating}
            className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50"
            title="Marcar en preparación"
          >
            <ChefHat className="w-4 h-4" />
          </button>
        )}

        {/* Botón: Listo para entrega (Package) - visible cuando está pendiente o en preparación */}
        {(status === 'pending' || status === 'preparing') && (
          <button
            onClick={() => handleStatusChange(order.fullId, order.id, 'ready')}
            disabled={isUpdating}
            className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full text-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
            title="Marcar listo para entrega"
          >
            <Package className="w-4 h-4" />
          </button>
        )}

        {/* Botón: Cancelar (X) - siempre visible para pedidos activos */}
        <button
          onClick={() => handleStatusChange(order.fullId, order.id, 'cancelled')}
          disabled={isUpdating}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          title="Cancelar pedido"
        >
          <X className="w-4 h-4" />
        </button>

          {/* Botón: Imprimir ticket */}
          <PrintButton 
            order={order} 
            variant="icon"
            businessName={businessInfo?.name || "Mi Restaurante"}
            businessAddress={businessInfo?.address || "Dirección del restaurante"}
            businessPhone={businessInfo?.phone || "Teléfono"}
          />

        {/* Botón: Ver detalles - siempre visible */}
        <button
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Ver detalles"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  };

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
      width: "150px",
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
      width: "120px",
      render: (order) => getActionsForStatus(order),
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
            <option value="preparing">En preparación</option>
            <option value="ready">Listo para entrega</option>
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
            keyExtractor={(order) => order.fullId || order.id}
            emptyMessage="No se encontraron pedidos"
          />
        )}
      </div>

    </div>
  );
}
