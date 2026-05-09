import { useState } from "react";
import clsx from "clsx";
import { Bell, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import OneSignal from "react-onesignal";
import { useOneSignal } from "@core/hooks/useOneSignal";
import { useAuth } from "@core/context/AuthContext";
import { forceRelinkOneSignalUser, sendActivationConfirmPush } from "@core/services/oneSignalService";

export interface EnableNotificationsButtonProps {
  variant?: "button" | "banner";
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
}

export function EnableNotificationsButton({
  variant = "button",
  className = "",
  onSuccess,
  onError,
  onDismiss,
}: EnableNotificationsButtonProps) {
  const { status, isSubscribed, requestPermission, optIn } = useOneSignal();
  const { user } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

  const showMessage = (text: string, type: "success" | "error" | "warning", autoHide = true) => {
    setMessage({ text, type });
    if (autoHide) setTimeout(() => setMessage(null), 4000);
  };

  const handleEnable = async () => {
    if (!user) {
      showMessage("Inicia sesión para activar notificaciones", "error");
      return;
    }

    if (status === "denied") {
      showMessage("Notificaciones bloqueadas. Ve a Configuración del navegador para reactivarlas.", "error");
      return;
    }

    setIsActivating(true);
    try {
      let finallySubscribed = false;

      if (status === "granted") {
        // Caso B: permiso ya concedido pero opted-out o suscripción huérfana
        await optIn();
        finallySubscribed = await forceRelinkOneSignalUser(user.id);
      } else {
        // Caso A: permiso no concedido — mostrar prompt nativo
        const granted = await requestPermission();
        if (!granted) {
          const msg =
            Notification.permission === "denied"
              ? "Activa las notificaciones en la configuración del navegador"
              : "Necesitas aceptar las notificaciones para continuar";
          onError?.(msg);
          showMessage(msg, "error");
          return;
        }
        finallySubscribed = OneSignal.User?.PushSubscription?.optedIn ?? false;
      }

      if (!finallySubscribed) {
        onError?.("No se pudo activar la suscripción");
        showMessage("No se pudo activar. Intenta de nuevo.", "error");
        return;
      }

      onSuccess?.();
      showMessage("¡Notificaciones activadas! Enviando confirmación...", "success");

      // Lanzar el push de confirmación en segundo plano con reintentos automáticos.
      // No bloqueamos el hilo: la suscripción ya es exitosa.
      sendActivationConfirmPush(user.id).then((sent) => {
        if (!sent) {
          showMessage(
            "Algo ha salido mal al confirmar la conexión. Por el momento no es posible recibir notificaciones a través de OneSignal — mantén la aplicación abierta para seguir recibiendo notificaciones internas.",
            "warning",
            false, // no se oculta automáticamente: el usuario debe verlo
          );
        }
        // Si sent === true, el push en sí llega al dispositivo como confirmación visual
      });
    } catch (error) {
      console.error("[EnableNotifications] Error:", error);
      onError?.("Error desconocido");
      showMessage("Ocurrió un error. Intenta de nuevo.", "error");
    } finally {
      setIsActivating(false);
    }
  };

  if (variant === "banner") {
    if (isSubscribed) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="w-full sm:w-[450px] flex flex-col gap-2">
          {message && (
            <div
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2",
                message.type === "success"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : message.type === "warning"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              )}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {message.text}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Activa notificaciones
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No te pierdas los pedidos entrantes
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleEnable}
                disabled={isActivating || isSubscribed}
                className="px-3 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 rounded-md transition-colors"
              >
                {isSubscribed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Activar"
                )}
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message && (
        <p
          className={clsx(
            "text-xs font-medium",
            message.type === "success"
              ? "text-green-600 dark:text-green-400"
              : message.type === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {message.text}
        </p>
      )}
      <button
        onClick={handleEnable}
        disabled={isActivating || isSubscribed}
        className={clsx(
          "flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors",
          isSubscribed
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-amber-500 text-white hover:bg-amber-600",
          isActivating && "opacity-50 cursor-wait",
          className
        )}
      >
        {isSubscribed ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Notificaciones activas</span>
          </>
        ) : isActivating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Activando...</span>
          </>
        ) : (
          <>
            <Bell className="w-5 h-5" />
            <span>Activar notificaciones</span>
          </>
        )}
      </button>
    </div>
  );
}
