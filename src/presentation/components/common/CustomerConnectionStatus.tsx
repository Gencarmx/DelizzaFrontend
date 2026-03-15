import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { useCustomerNotificationsContext } from "@core/context/CustomerNotificationsContext";

export function CustomerConnectionStatus() {
  const { isConnected, isReconnecting, reconnectAttempt, maxReconnectReached, reconnect } =
    useCustomerNotificationsContext();

  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
        <Wifi className="w-3.5 h-3.5" />
        <span>Conectado</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Sin conexión</span>
      </div>

      {maxReconnectReached ? (
        <button
          onClick={reconnect}
          className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          title="Reconectar manualmente"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      ) : isReconnecting ? (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {reconnectAttempt}/{5}
          </span>
        </div>
      ) : null}
    </div>
  );
}
