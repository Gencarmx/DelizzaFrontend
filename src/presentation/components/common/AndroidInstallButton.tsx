import { Download, X } from "lucide-react";
import { usePWAInstall } from "@presentation/logic/usePWAInstall";

export function AndroidInstallButton() {
  const { canInstall, triggerInstall, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg pl-3 pr-1 py-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
          Instalar app
        </span>
        <button
          onClick={triggerInstall}
          className="bg-amber-400 hover:bg-amber-500 text-white rounded-full p-2 transition-colors shadow-sm"
          aria-label="Instalar aplicación"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
