import { Outlet } from "react-router";
import { Loader2, Bell, X } from "lucide-react";
import { RestaurantBottomNav } from "@presentation/components/layout/RestaurantBottomNav";
import { RestaurantNotificationsProvider, useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { AndroidInstallButton } from "@presentation/components/common/AndroidInstallButton";
import { useState, useEffect } from "react";

// Componente interno que maneja la lógica
function RestaurantLayoutContent() {
  const {
    businessIdLoading,
    hasNewOrder,
    latestOrder,
    markAsRead,
  } = useRestaurantNotifications();

  const [showNotification, setShowNotification] = useState(false);

  // Mostrar toast cuando llega un nuevo pedido
  useEffect(() => {
    if (hasNewOrder && latestOrder) {
      setShowNotification(true);

      const timer = setTimeout(() => {
        setShowNotification(false);
        markAsRead();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [hasNewOrder, latestOrder, markAsRead]);

  // Mostrar spinner mientras el contexto resuelve el businessId por primera vez.
  // Esto reemplaza el localLoading anterior que vivía en el layout y podía
  // desmontar/remontar el Outlet causando loops de carga en el Dashboard.
  if (businessIdLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Notificación de Nuevo Pedido */}
      {showNotification && latestOrder && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-green-500 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in">
            <Bell className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">¡Nuevo Pedido!</h4>
              <p className="text-sm font-medium mt-1">
                {latestOrder.customer_name || 'Cliente'}
              </p>
              <p className="text-sm opacity-90 mt-1">
                ${latestOrder.total.toFixed(2)} - {latestOrder.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} productos
              </p>
              <div className="mt-2 space-y-0.5">
                {latestOrder.order_items?.slice(0, 3).map((item, idx) => (
                  <p key={idx} className="text-xs opacity-80 truncate">
                    {item.quantity}x {item.product_name}
                  </p>
                ))}
                {(latestOrder.order_items?.length || 0) > 3 && (
                  <p className="text-xs opacity-75">
                    +{(latestOrder.order_items!.length - 3)} más...
                  </p>
                )}
              </div>
              <p className="text-xs opacity-75 mt-2">
                {new Date(latestOrder.created_at || '').toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => {
                setShowNotification(false);
                markAsRead();
              }}
              className="text-white hover:bg-green-600 rounded-full p-1 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-xl">
            D
          </div>
          <div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">LIZZA</span>
            <span className="text-[10px] text-gray-400 block">RESTAURANTE</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <Outlet />
      </main>

      <RestaurantBottomNav />
      <AndroidInstallButton />

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}

// Layout principal con provider
export default function RestaurantLayout() {
  return (
    <RestaurantNotificationsProvider>
      <RestaurantLayoutContent />
    </RestaurantNotificationsProvider>
  );
}
