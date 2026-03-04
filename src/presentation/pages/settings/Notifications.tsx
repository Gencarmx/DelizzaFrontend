import { useEffect, useState } from "react";
import { Bell, Package, CheckCircle2, XCircle, Clock, ChevronLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "@core/supabase/client";
import { getOrdersByCustomer, type OrderWithItems } from "@core/services/orderService";

function getStatusConfig(status: string | null) {
  switch (status) {
    case "completed":
      return { icon: CheckCircle2, iconBg: "bg-green-100", iconColor: "text-green-600", title: "Pedido entregado", label: "Entregado" };
    case "cancelled":
      return { icon: XCircle, iconBg: "bg-red-100", iconColor: "text-red-600", title: "Pedido cancelado", label: "Cancelado" };
    case "confirmed":
      return { icon: CheckCircle2, iconBg: "bg-blue-100", iconColor: "text-blue-600", title: "Pedido confirmado", label: "Confirmado" };
    case "preparing":
      return { icon: Package, iconBg: "bg-amber-100", iconColor: "text-amber-600", title: "Pedido en preparación", label: "Preparando" };
    case "ready":
      return { icon: Package, iconBg: "bg-green-100", iconColor: "text-green-600", title: "Pedido listo", label: "Listo para recoger" };
    case "pending":
    default:
      return { icon: Clock, iconBg: "bg-gray-100", iconColor: "text-gray-500", title: "Pedido recibido", label: "Pendiente" };
  }
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffDays === 1) return "Ayer";
  return `Hace ${diffDays} días`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Debes iniciar sesión para ver tus notificaciones");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile) {
          setError("Perfil no encontrado");
          return;
        }

        const ordersData = await getOrdersByCustomer(profile.id, 30);
        if (!cancelled) {
          setOrders(ordersData);
        }
      } catch (err) {
        console.error("Error cargando notificaciones:", err);
        if (!cancelled) setError("Error al cargar las notificaciones");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNotifications();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 bg-white sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="font-bold text-lg text-gray-900">Notificaciones</h2>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-1">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const { icon: Icon, iconBg, iconColor, title } = getStatusConfig(order.status);
            const businessName = order.business_name || (order as any).businesses?.name || "Restaurante";
            const itemsText = order.order_items?.length > 0
              ? order.order_items.map(i => `${i.quantity}x ${i.product_name || "Producto"}`).join(", ")
              : "Sin items";

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex gap-4"
              >
                <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                    {businessName} — {itemsText}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {order.created_at ? getRelativeTime(order.created_at) : ""}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      ${(order.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg mb-2">
            No hay notificaciones
          </h3>
          <p className="text-sm text-gray-500 text-center">
            Cuando tengas nuevas notificaciones aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
}
