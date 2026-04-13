import { useNavigate } from "react-router";
import { ChevronLeft, Bell, BellOff, BellRing, ExternalLink } from "lucide-react";
import { useOneSignal } from "@core/hooks/useOneSignal";

export default function RestaurantNotifications() {
  const navigate = useNavigate();
  const { status, isSubscribed, isLoading, requestPermission, optOut, optIn } = useOneSignal();

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

        {status === "unsupported" ? (
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <BellOff className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Tu navegador no soporta notificaciones push. Prueba con Chrome o Firefox.
            </p>
          </div>
        ) : status === "denied" ? (
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
        ) : status === "granted" && isSubscribed ? (
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
              onClick={optOut}
              disabled={isLoading}
              className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {isLoading ? "..." : "Desactivar"}
            </button>
          </div>
        ) : status === "granted" && !isSubscribed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Desactivadas en este dispositivo
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Tienes permiso concedido — puedes reactivarlas
                </p>
              </div>
            </div>
            <button
              onClick={optIn}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {isLoading ? "..." : "Activar"}
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
              onClick={requestPermission}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {isLoading ? "..." : "Activar"}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <span className="font-semibold">¿Cómo funciona?</span> Las notificaciones se entregan
          a través de OneSignal, que gestiona automáticamente todos los dispositivos donde hayas
          iniciado sesión. Cuando llegue un nuevo pedido recibirás una alerta en todos ellos,
          incluso si el navegador está completamente cerrado.
        </p>
        <a
          href="https://onesignal.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 w-fit"
        >
          <ExternalLink className="w-3 h-3" />
          Más info sobre OneSignal
        </a>
      </div>
    </div>
  );
}
