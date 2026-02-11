import { useState, useEffect } from "react";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { getOrdersByCustomer, type OrderWithItems } from "@core/services/orderService";
import { supabase } from "@core/supabase/client";

export default function Activity() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Debes iniciar sesión para ver tu actividad");
          setLoading(false);
          return;
        }

        // Obtener el profile.id del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile) {
          setError("Perfil no encontrado");
          setLoading(false);
          return;
        }

        // Obtener pedidos del cliente
        const ordersData = await getOrdersByCustomer(profile.id, 20);
        setOrders(ordersData);
      } catch (err) {
        console.error("Error cargando pedidos:", err);
        setError("Error al cargar tu historial de pedidos");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Función para formatear la fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para obtener el icono y color según el estado
  const getStatusConfig = (status: string | null) => {

    switch (status) {
      case 'completed':
        return { color: "text-green-500", Icon: CheckCircle2, label: "Entregado" };
      case 'cancelled':
        return { color: "text-red-500", Icon: XCircle, label: "Cancelado" };
      case 'pending':
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return { color: "text-amber-500", Icon: Clock, label: "En progreso" };
      default:
        return { color: "text-gray-500", Icon: Clock, label: status };
    }
  };

  // Función para formatear items del pedido
  const formatItems = (orderItems: OrderWithItems['order_items']) => {
    if (!orderItems || orderItems.length === 0) return "Sin items";
    const itemsList = orderItems.map(item => item.product_name || "Producto").join(", ");
    return itemsList.length > 50 ? itemsList.substring(0, 50) + "..." : itemsList;
  };

  if (loading) {

    return (
      <div className="flex flex-col pt-2">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
          Actividad
        </h2>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col pt-2">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
          Actividad
        </h2>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col pt-2">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
          Actividad
        </h2>
        <div className="text-center py-12 px-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No tienes pedidos recientes. ¡Haz tu primera orden!
          </p>
        </div>
      </div>
    );
  }

  return (

    <div className="flex flex-col pt-2">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        Actividad
      </h2>

      <div className="flex flex-col gap-4">
        {orders.map((order) => {
          const { color, Icon, label } = getStatusConfig(order.status || 'pending');

          if (!order.id) return null;
          return (
            <div
              key={order.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {(order as any).businesses?.name || "Restaurante"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {order.created_at ? formatDate(order.created_at) : "Fecha no disponible"}
                  </span>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {formatItems(order.order_items)}
                  </p>
                </div>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-700" />

              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                  {label}
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">
                  ${(order.total || 0).toFixed(2)}
                </span>

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
