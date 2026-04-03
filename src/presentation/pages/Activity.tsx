import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Clock, XCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getOrdersByCustomer,
  type OrderWithItems,
} from "@core/services/orderService";
import { useAuth } from "@core/context/AuthContext";
import { useCustomerNotificationsContext } from "@core/context/CustomerNotificationsContext";

const PAGE_SIZE = 5;

export default function Activity() {
  const { profileId, user } = useAuth();
  const { registerOrderUpdateCallback } = useCustomerNotificationsContext();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadOrders = useCallback(
    async (pid: string) => {
      const result = await getOrdersByCustomer(pid, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE);
      setOrders(result.orders);
      setTotal(result.total);
    },
    [currentPage],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setError("Debes iniciar sesión para ver tu actividad");
        setLoading(false);
        return;
      }
      if (!profileId) {
        setError("Perfil no encontrado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await getOrdersByCustomer(profileId, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE);
        if (!cancelled) {
          setOrders(result.orders);
          setTotal(result.total);
        }
      } catch (err) {
        console.error("Error cargando pedidos:", err);
        if (!cancelled) setError("Error al cargar tu historial de pedidos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user, profileId, currentPage]);

  useEffect(() => {
    if (!profileId) return;

    registerOrderUpdateCallback(() => {
      reloadOrders(profileId);
    });

    return () => {
      registerOrderUpdateCallback(null);
    };
  }, [profileId, registerOrderUpdateCallback, reloadOrders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case "completed":
        return { color: "text-green-500", Icon: CheckCircle2, label: "Entregado" };
      case "cancelled":
        return { color: "text-red-500", Icon: XCircle, label: "Cancelado" };
      case "pending":
        return { color: "text-amber-500", Icon: Clock, label: "Pendiente" };
      case "confirmed":
        return { color: "text-blue-500", Icon: CheckCircle2, label: "Confirmado" };
      case "preparing":
        return { color: "text-orange-500", Icon: Loader2, label: "Preparando" };
      case "ready":
        return { color: "text-green-600", Icon: CheckCircle2, label: "Listo para recoger" };
      default:
        return { color: "text-gray-500", Icon: Clock, label: status || "Desconocido" };
    }
  };

  const formatItems = (orderItems: OrderWithItems["order_items"]) => {
    if (!orderItems || orderItems.length === 0) return "Sin items";
    const itemsList = orderItems.map((item) => item.product_name || "Producto").join(", ");
    return itemsList.length > 50 ? itemsList.substring(0, 50) + "..." : itemsList;
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="flex flex-col pt-2 pb-24 gap-4">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        Actividad
      </h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 px-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {total === 0
              ? "No tienes pedidos recientes. ¡Haz tu primera orden!"
              : "No hay pedidos en esta página."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {orders.map((order) => {
              const { color, Icon, label } = getStatusConfig(order.status || "pending");
              if (!order.id) return null;
              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 flex flex-col gap-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {order.business_name || (order as any).businesses?.name || "Restaurante"}
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

          {/* Paginador */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rangeStart}–{rangeEnd} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1 || loading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages || loading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
