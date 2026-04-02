import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Bell, BellOff, BellRing, Monitor, Smartphone, Loader2, Trash2 } from "lucide-react";
import { usePushNotifications } from "@core/hooks/usePushNotifications";
import { supabase } from "@core/supabase/client";

interface PushDevice {
  id: string;
  endpoint: string;
  user_agent: string | null;
  created_at: string;
}

function getDeviceLabel(userAgent: string | null): { label: string; icon: typeof Monitor } {
  if (!userAgent) return { label: "Dispositivo desconocido", icon: Monitor };
  const ua = userAgent.toLowerCase();
  if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("mobile")) {
    return { icon: Smartphone, label: "Dispositivo móvil" };
  }
  return { icon: Monitor, label: "Computadora" };
}

function getBrowserName(userAgent: string | null): string {
  if (!userAgent) return "";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) return "Safari";
  return "Navegador";
}

function getRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffDays === 1) return "Ayer";
  return `Hace ${diffDays} días`;
}

export default function RestaurantNotifications() {
  const navigate = useNavigate();
  const { isSupported, permissionState, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadDevices = async () => {
    try {
      setLoadingDevices(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, user_agent, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setDevices(data ?? []);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => { loadDevices(); }, []);

  // Recargar lista tras suscribir/desuscribir
  const handleSubscribe = async () => {
    await subscribe();
    await loadDevices();
  };

  const handleUnsubscribe = async () => {
    await unsubscribe();
    await loadDevices();
  };

  const removeDevice = async (deviceId: string, endpoint: string) => {
    setRemovingId(deviceId);
    try {
      // Si el dispositivo a eliminar es el actual, desuscribir del navegador también
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub?.endpoint === endpoint) {
        await sub.unsubscribe();
      }

      await supabase.from("push_subscriptions").delete().eq("id", deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/restaurant/settings")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notificaciones push
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recibe alertas de nuevos pedidos aunque el browser esté cerrado
          </p>
        </div>
      </div>

      {/* Estado actual */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Estado en este dispositivo
        </h2>

        {!isSupported ? (
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <BellOff className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Tu navegador no soporta notificaciones push. Prueba con Chrome o Firefox.
            </p>
          </div>
        ) : permissionState === "denied" ? (
          <div className="flex items-start gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mt-0.5">
              <BellOff className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Notificaciones bloqueadas
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Para activarlas ve a la configuración del navegador → Permisos del sitio → Notificaciones → Permitir.
              </p>
            </div>
          </div>
        ) : permissionState === "granted" && isSubscribed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Activas en este dispositivo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Recibirás alertas de nuevos pedidos
                </p>
              </div>
            </div>
            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {isLoading ? "..." : "Desactivar"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  No activadas
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  No recibirás alertas cuando el browser esté cerrado
                </p>
              </div>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {isLoading ? "..." : "Activar"}
            </button>
          </div>
        )}
      </div>

      {/* Dispositivos suscritos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Dispositivos suscritos
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Recibirás notificaciones en cada uno de estos dispositivos
          </p>
        </div>

        {loadingDevices ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center py-10 px-4 text-center">
            <BellOff className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ningún dispositivo suscrito
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Activa las notificaciones en este u otros dispositivos
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {devices.map((device) => {
              const { label, icon: DeviceIcon } = getDeviceLabel(device.user_agent);
              const browser = getBrowserName(device.user_agent);
              return (
                <li
                  key={device.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="bg-gray-100 dark:bg-gray-700 p-2.5 rounded-xl flex-shrink-0">
                    <DeviceIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {label}{browser ? ` · ${browser}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Suscrito {getRelativeTime(device.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeDevice(device.id, device.endpoint)}
                    disabled={removingId === device.id}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-gray-400 hover:text-red-500 flex-shrink-0 disabled:opacity-50"
                    title="Eliminar este dispositivo"
                  >
                    {removingId === device.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <span className="font-semibold">¿Cómo funciona?</span> Al activar las notificaciones en un dispositivo, este queda registrado. Cuando llegue un nuevo pedido recibirás una alerta en todos los dispositivos suscritos, incluso si el navegador está completamente cerrado.
        </p>
      </div>
    </div>
  );
}
