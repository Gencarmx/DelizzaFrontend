import { Bell } from "lucide-react";
import { useCustomerNotificationsContext } from "@core/context/CustomerNotificationsContext";

export function NotificationPermissionBanner() {
  const { permissionStatus, requestPermission } =
    useCustomerNotificationsContext();

  if (!("Notification" in window)) return null;
  if (permissionStatus !== "default") return null;

  return (
    <div className="mx-4 mt-3 mb-1 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-full">
          <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Activar notificaciones
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Entérate cuando tu pedido esté listo
          </span>
        </div>
      </div>
      <button
        onClick={requestPermission}
        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        Activar
      </button>
    </div>
  );
}
