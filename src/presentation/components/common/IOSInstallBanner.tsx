import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone: boolean }).standalone ===
        true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

const STORAGE_KEY = "pwa-ios-install-dismissed";

export function IOSInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isIOS()) return;
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const steps = [
    {
      icon: (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 shrink-0">
          <Share className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      ),
      title: 'Toca "Compartir"',
      description: (
        <>
          Pulsa el botón{" "}
          <span className="inline-flex items-center gap-0.5 font-semibold text-blue-600 dark:text-blue-400">
            <Share className="w-3.5 h-3.5" /> Compartir
          </span>{" "}
          en la barra inferior de Safari.
        </>
      ),
    },
    {
      icon: (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
          <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
      ),
      title: '"Añadir a pantalla de inicio"',
      description: (
        <>
          Desplázate en el menú y selecciona{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            Añadir a pantalla de inicio
          </span>
          .
        </>
      ),
    },
    {
      icon: (
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 shrink-0">
          <span className="text-lg">✓</span>
        </div>
      ),
      title: "Confirma y listo",
      description: (
        <>
          Pulsa{" "}
          <span className="font-semibold text-green-600 dark:text-green-400">
            Añadir
          </span>{" "}
          en la esquina superior derecha. La app aparecerá en tu pantalla de
          inicio.
        </>
      ),
    },
  ];

  return (
    <div className="mx-4 mt-3 mb-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm">
            D
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
              Instala la app
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Accede rápido desde tu pantalla de inicio
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="flex gap-1 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-amber-400" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-start gap-3 min-h-[64px]">
          {steps[step].icon}
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {steps[step].title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
              {steps[step].description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-t border-gray-100 dark:border-gray-700">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Anterior
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={dismiss}
            className="flex-1 py-2.5 text-xs font-semibold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            Entendido
          </button>
        )}
      </div>
    </div>
  );
}
