import { BellOff, BellRing } from "lucide-react";
import { useOneSignal } from "@core/hooks/useOneSignal";

export function NotificationPermissionBanner() {
  const { status, isSubscribed, isLoading, requestPermission } = useOneSignal();

  // No soportado
  if (status === "unsupported") return null;

  // Ya está suscrito y con permisos
  if (status === "granted" && isSubscribed) return null;

  // Permisos bloqueados por el usuario
  if (status === "denied") {
    return (
      <div className="mx-4 mt-3 mb-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Notificaciones bloqueadas. Actívalas en la configuración del navegador.
        </p>
      </div>
    );
  }

  // Estado default — mostrar banner de activación
  return (
    <div className="mx-4 mt-3 mb-1 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-full">
          <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Activar notificaciones
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Recibe actualizaciones de tus pedidos en tiempo real
          </span>
        </div>
      </div>
      <button
        id="btn-enable-onesignal-notifications"
        onClick={requestPermission}
        disabled={isLoading}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        {isLoading ? "..." : "Activar"}
      </button>
    </div>
  );
}
