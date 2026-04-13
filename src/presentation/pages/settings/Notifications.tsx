import { Bell, BellOff, BellRing, ChevronLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router";
import { useOneSignal } from "@core/hooks/useOneSignal";

export default function Notifications() {
  const navigate = useNavigate();
  const { status, isSubscribed, isLoading, requestPermission, optOut, optIn } = useOneSignal();

  return (
    <div className="flex flex-col pt-2 pb-24 gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            Notificaciones push
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Recibe alertas del estado de tus pedidos
          </p>
        </div>
      </div>

      {/* Estado en este dispositivo */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Estado en este dispositivo
        </h3>

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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Ve a la configuración del navegador → Permisos del sitio → Notificaciones → Permitir.
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
                  Recibirás alertas del estado de tus pedidos
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
                  No recibirás alertas aunque cierres el browser
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
          iniciado sesión. Recibirás alertas incluso si el navegador está completamente cerrado.
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
