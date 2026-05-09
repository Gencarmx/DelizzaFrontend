import { Outlet, useNavigate } from "react-router";
import { Loader2, Bell, X, Bike, Volume2 } from "lucide-react";
import { RestaurantBottomNav } from "@presentation/components/layout/RestaurantBottomNav";
import { RestaurantNotificationsProvider, useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { AndroidInstallButton } from "@presentation/components/common/AndroidInstallButton";
import { NotificationPermissionBanner } from "@presentation/components/common/NotificationPermissionBanner";
import { EnableNotificationsButton } from "@presentation/components/common/EnableNotificationsButton";
import { useOneSignal } from "@core/hooks/useOneSignal";
import { useOrderAlarm } from "@core/hooks/useOrderAlarm";
import { useAuth } from "@core/context/AuthContext";
import { useState, useEffect } from "react";

const DISMISS_KEY = "notifications-banner-dismissed-v1";
const ALARM_TIP_KEY = "restaurant-alarm-tip-dismissed";

// Componente interno que maneja la lógica
function RestaurantLayoutContent() {
  const navigate = useNavigate();
  const {
    businessIdLoading,
    hasNewOrder,
    latestOrder,
    markAsRead,
  } = useRestaurantNotifications();
  const { isSubscribed, status } = useOneSignal();
  const { role } = useAuth();
  const { startAlarm, stopAlarm, unlockAudio, isPlaying } = useOrderAlarm();

  const [showNotification, setShowNotification] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showAlarmTip, setShowAlarmTip] = useState(
    () => localStorage.getItem(ALARM_TIP_KEY) !== "true"
  );

  // Desbloquear AudioContext en el primer gesto del usuario (política de autoplay)
  useEffect(() => {
    const unlock = () => unlockAudio();
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("mousedown", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("mousedown", unlock);
    };
  }, [unlockAudio]);

  // Arrancar alarma al llegar un pedido nuevo (sin auto-dismiss)
  useEffect(() => {
    if (hasNewOrder && latestOrder) {
      setShowNotification(true);
      startAlarm();
    }
  }, [hasNewOrder, latestOrder, startAlarm]);

  // Cualquier toque mientras la alarma suena: detenerla y acusar recibo
  useEffect(() => {
    if (!isPlaying) return;

    const acknowledge = () => {
      stopAlarm();
      setShowNotification(false);
      markAsRead();
    };

    // capture: true — se ejecuta antes que cualquier otro handler de la app
    document.addEventListener("touchstart", acknowledge, { once: true, capture: true });
    document.addEventListener("mousedown", acknowledge, { once: true, capture: true });

    return () => {
      document.removeEventListener("touchstart", acknowledge, { capture: true });
      document.removeEventListener("mousedown", acknowledge, { capture: true });
    };
  }, [isPlaying, stopAlarm, markAsRead]);

  // Banner de reactivación de notificaciones OneSignal
  useEffect(() => {
    if (role !== "owner") return;
    if (isSubscribed) return;
    if (status === "denied" || status === "unsupported") return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const timer = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(timer);
  }, [isSubscribed, status, role]);

  useEffect(() => {
    if (isSubscribed) setShowBanner(false);
  }, [isSubscribed]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  const handleDismissAlarmTip = () => {
    setShowAlarmTip(false);
    localStorage.setItem(ALARM_TIP_KEY, "true");
  };

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
      {/* Toast de nuevo pedido — solo se cierra con toque (no auto-dismiss) */}
      {showNotification && latestOrder && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className="bg-green-500 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in">
            <Bell className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">¡Nuevo Pedido!</h4>
              <p className="text-sm font-medium mt-1">
                {latestOrder.customer_name || "Cliente"}
              </p>
              <p className="text-sm opacity-90 mt-1">
                ${latestOrder.total.toFixed(2)} -{" "}
                {latestOrder.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} productos
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
                {new Date(latestOrder.created_at || "").toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => {
                stopAlarm();
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

      <NotificationPermissionBanner />

      {/* Tip de alarma — aparece una sola vez para educar al owner */}
      {showAlarmTip && role === "owner" && (
        <div className="mx-4 mt-3 mb-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Volume2 className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
            Cuando llegue un pedido sonará una alarma. Puedes <strong>minimizar</strong> la app, pero no cerrarla para que la alarma funcione.
          </p>
          <button
            onClick={handleDismissAlarmTip}
            className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 flex-shrink-0"
            aria-label="Entendido"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/restaurant/dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="Ir al dashboard"
        >
          <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-xl">
            D
          </div>
          <div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">LIZZA</span>
            <span className="text-[10px] text-gray-400 block">RESTAURANTE</span>
          </div>
        </button>

        {/* Acceso rápido a opciones de entrega */}
        <button
          onClick={() => navigate("/restaurant/settings/business-info")}
          className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-xl transition-colors"
          title="Configura si ofreces domicilio o retiro en tienda"
        >
          <Bike className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold leading-tight">
            Opciones<br className="hidden xs:block" /> de entrega
          </span>
        </button>
      </header>

      <main className="flex-1 p-4">
        <Outlet />
      </main>

      <RestaurantBottomNav />
      <AndroidInstallButton />

      {showBanner && (
        <EnableNotificationsButton
          variant="banner"
          onSuccess={() => setShowBanner(false)}
          onDismiss={handleDismiss}
        />
      )}

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
