import { BellOff, BellRing } from "lucide-react";
import { usePushNotifications } from "@core/hooks/usePushNotifications";

export function NotificationPermissionBanner() {
  const { isSupported, permissionState, isSubscribed, isLoading, subscribe } =
    usePushNotifications();

  // Navegador sin soporte para Web Push
  if (!isSupported) return null;

  // Ya tiene permiso y está suscrito — no molestar
  if (permissionState === "granted" && isSubscribed) return null;

  // El usuario bloqueó los permisos — mostrar instrucción informativa
  if (permissionState === "denied") {
    return (
      <div className="mx-4 mt-3 mb-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Notificaciones bloqueadas. Actívalas en la configuración del
          navegador.
        </p>
      </div>
    );
  }

  // Estado "default" (no ha decidido) o tiene permiso pero sin suscripción push
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
            Recibe actualizaciones de tus pedidos
          </span>
        </div>
      </div>
      <button
        id="btn-enable-push-notifications"
        onClick={subscribe}
        disabled={isLoading}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        {isLoading ? "..." : "Activar"}
      </button>
    </div>
  );
}
