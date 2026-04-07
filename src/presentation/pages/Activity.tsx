import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { CheckCircle2, Clock, XCircle, Loader2, ChevronLeft, ChevronRight, ChevronDown, Copy, ExternalLink } from "lucide-react";
import {
  getOrdersByCustomer,
  type OrderWithItems,
  type OrderStatus,
} from "@core/services/orderService";
import { useAuth } from "@core/context/AuthContext";
import { useCustomerNotificationsContext } from "@core/context/CustomerNotificationsContext";

const PAGE_SIZE = 5;

type FilterStatus = OrderStatus | null;

interface StatusFilterOption {
  value: FilterStatus;
  label: string;
}

const STATUS_FILTERS: StatusFilterOption[] = [
  { value: "completed",        label: "Entregado" },
  { value: null,               label: "Todos" },
  { value: "awaiting_payment", label: "Esperando pago" },
  { value: "pending",          label: "Pendiente" },
  { value: "confirmed",        label: "Confirmado" },
  { value: "preparing",        label: "Preparando" },
  { value: "ready",            label: "Listo" },
  { value: "cancelled",        label: "Cancelado" },
];

export default function Activity() {
  const { profileId, user } = useAuth();
  const { registerOrderUpdateCallback } = useCustomerNotificationsContext();
  const location = useLocation();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2500);
    } catch {
      // fallback silencioso
    }
  };

  const initialFilter = (location.state as { defaultFilter?: FilterStatus } | null)?.defaultFilter ?? "completed";

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadOrders = useCallback(
    async (pid: string) => {
      const result = await getOrdersByCustomer(pid, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE, selectedStatus);
      setOrders(result.orders);
      setTotal(result.total);
    },
    [currentPage, selectedStatus],
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
        const result = await getOrdersByCustomer(profileId, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE, selectedStatus);
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
  }, [user, profileId, currentPage, selectedStatus]);

  useEffect(() => {
    if (!profileId) return;

    registerOrderUpdateCallback(() => {
      reloadOrders(profileId);
    });

    return () => {
      registerOrderUpdateCallback(null);
    };
  }, [profileId, registerOrderUpdateCallback, reloadOrders]);

  const handleStatusChange = (status: FilterStatus) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

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
      case "awaiting_payment":
        return { color: "text-indigo-500", Icon: Clock, label: "Pendiente de confirmación de pago" };
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

  const emptyMessage = selectedStatus
    ? `No tienes pedidos con estado "${getStatusConfig(selectedStatus).label.toLowerCase()}".`
    : "No tienes pedidos recientes. ¡Haz tu primera orden!";

  return (
    <div className="flex flex-col pt-2 pb-24 gap-4">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        Actividad
      </h2>

      {/* Filtro de estado */}
      <div className="relative w-fit">
        <select
          value={selectedStatus ?? ""}
          onChange={e => handleStatusChange((e.target.value || null) as FilterStatus)}
          className="appearance-none w-48 pl-3 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent cursor-pointer transition-colors"
        >
          {STATUS_FILTERS.map(({ value, label }) => (
            <option key={value ?? "all"} value={value ?? ""}>
              {label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

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
          <p className="text-gray-500 dark:text-gray-400 text-sm">{emptyMessage}</p>
          {selectedStatus && (
            <button
              onClick={() => handleStatusChange(null)}
              className="text-sm text-amber-500 hover:underline mt-2"
            >
              Ver todos los pedidos
            </button>
          )}
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
                  className={`rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border flex flex-col gap-4 ${
                    order.status === 'awaiting_payment'
                      ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 flex-1 min-w-0 mr-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {order.business_name || (order as any).businesses?.name || "Restaurante"}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleCopy(order.id.slice(-8).toUpperCase())}
                          className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copiar ID"
                        >
                          {copiedText === order.id.slice(-8).toUpperCase()
                            ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                            : <Copy className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                        </button>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {order.created_at ? formatDate(order.created_at) : "Fecha no disponible"}
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {formatItems(order.order_items)}
                      </p>
                    </div>
                    <Icon className={`w-6 h-6 ${color} flex-shrink-0`} />
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-gray-700" />

                  <div className="flex justify-between items-center">
                    <span className={`font-medium text-sm ${color}`}>
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-lg">
                        ${(order.total || 0).toFixed(2)}
                      </span>
                      {order.status === 'awaiting_payment' && (
                        <button
                          onClick={() => handleCopy((order.total || 0).toFixed(2))}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copiar monto"
                        >
                          {copiedText === (order.total || 0).toFixed(2)
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Awaiting payment: show short ID and pay link */}
                  {order.status === 'awaiting_payment' && (() => {
                    const shortId = order.id.slice(-8).toUpperCase();
                    const mpLink = order.mercado_pago_link || (order as any).businesses?.mercado_pago_link;
                    return (
                      <div className="flex flex-col gap-3 pt-1">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                          Incluye el siguiente ID en el asunto de tu pago para que el restaurante pueda identificarlo:
                        </p>
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-2">
                          <span className="font-mono font-bold text-base text-indigo-700 dark:text-indigo-300 flex-1 tracking-wider">
                            {shortId}
                          </span>
                          <button
                            onClick={() => handleCopy(shortId)}
                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          >
                            {copiedText === shortId
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        </div>
                        {mpLink && (
                          <a
                            href={mpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ir a pagar
                          </a>
                        )}
                      </div>
                    );
                  })()}
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
