import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Globe,
  Moon,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  Clock,
  PauseCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@core/context/AuthContext";
import { useTheme } from "@core/context";
import { supabase } from "@core/supabase/client";
import { setBusinessPaused } from "@core/services/businessService";
import { getBusinessByOwner } from "@core/services/businessService";

type SettingItem = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  type: "toggle" | "link";
  value?: boolean | string;
  onChange?: (value: boolean) => void;
  danger?: boolean;
};

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, profileId } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // — Modo Hibernación —
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);

  // Determine context based on URL
  const isRestaurant = location.pathname.includes("/restaurant");

  // Cargar businessId y estado de pausa al entrar a la sección de restaurante
  useEffect(() => {
    if (!isRestaurant || !user || !profileId) return;
    // profileId ya resuelto por AuthContext — evita re-consultar profiles
    getBusinessByOwner(profileId).then(business => {
      if (!business) return;
      setBusinessId(business.id);
      supabase
        .from('businesses')
        .select('is_paused')
        .eq('id', business.id)
        .single()
        .then(({ data }) => {
          if (data) setIsPaused(data.is_paused);
        });
    });
  }, [isRestaurant, user, profileId]);

  const handleTogglePause = async () => {
    if (!businessId || pauseLoading) return;
    const newPaused = !isPaused;
    setIsPaused(newPaused); // Optimistic
    setPauseLoading(true);
    try {
      await setBusinessPaused(businessId, newPaused);
    } catch {
      setIsPaused(!newPaused); // Revertir
    } finally {
      setPauseLoading(false);
    }
  };

  // Sync darkMode state with global theme
  const darkMode = effectiveTheme === "dark";

  // Handler for dark mode toggle
  const handleDarkModeToggle = (value: boolean) => {
    setTheme(value ? "dark" : "light");
  };

  const commonSections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Cuenta",
      items: [
        {
          icon: LogOut,
          label: "Cerrar sesión",
          type: "link",
          danger: true,
          onChange: () => {
            signOut();
            navigate("/login");
          },
        },
      ],
    },
  ];

  const clientSections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Preferencias",
      items: [
        {
          icon: Bell,
          label: "Notificaciones push",
          type: "toggle",
          value: notificationsEnabled,
          onChange: setNotificationsEnabled,
        },
        {
          icon: Moon,
          label: "Modo oscuro",
          type: "toggle",
          value: darkMode,
          onChange: handleDarkModeToggle,
        },
        {
          icon: Globe,
          label: "Idioma",
          type: "link",
          value: "Español",
        },
      ],
    },
    {
      title: "Seguridad y privacidad",
      items: [
        {
          icon: Shield,
          label: "Privacidad",
          type: "link",
        },
        {
          icon: FileText,
          label: "Términos y condiciones",
          type: "link",
        },
      ],
    },
    {
      title: "Soporte",
      items: [
        {
          icon: HelpCircle,
          label: "Centro de ayuda",
          type: "link",
        },
      ],
    },
  ];

  const restaurantSections: { title: string; items: SettingItem[] }[] = [
    {
      title: "Negocio",
      items: [
        {
          icon: Globe,
          label: "Información del negocio",
          type: "link",
          onChange: () => navigate("/restaurant/settings/business-info"),
        },
        {
          icon: Clock,
          label: "Horarios de atención",
          type: "link",
          onChange: () => navigate("/restaurant/settings/business-hours"),
        },
      ],
    },
    {
      title: "Preferencias",
      items: [
        {
          icon: Moon,
          label: "Modo oscuro",
          type: "toggle",
          value: darkMode,
          onChange: handleDarkModeToggle,
        },
      ],
    },
  ];

  const settingsSections = [
    ...(isRestaurant ? restaurantSections : clientSections),
    ...commonSections,
  ];

  return (
    <div className="flex flex-col pt-2 pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(isRestaurant ? "/restaurant/dashboard" : "/")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          {isRestaurant ? "Configuración del Restaurante" : "Configuración"}
        </h2>
      </div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className={`relative flex items-center justify-between p-4 ${
                    itemIndex !== section.items.length - 1
                      ? "border-b border-gray-100 dark:border-gray-700"
                      : ""
                  } ${
                    item.type === "link"
                      ? "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-5 h-5 ${
                        item.danger
                          ? "text-red-500"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`text-sm font-medium ${
                        item.danger
                          ? "text-red-500"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {item.type === "toggle" && (
                    <button
                      onClick={() => item.onChange?.(!(item.value as boolean))}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        item.value ? "bg-amber-400" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          item.value ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  )}

                  {item.type === "link" && (
                    <div className="flex items-center gap-2">
                      {item.value && typeof item.value === "string" && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {item.value}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  {/* Handle click for link items, especially logout which uses onChange */}
                  {item.type === "link" && item.onChange && (
                    <div
                      className="absolute inset-0"
                      onClick={() => item.onChange?.(true)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

          {/* Sección Disponibilidad — solo visible en contexto restaurante */}
        {isRestaurant && businessId && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
              Disponibilidad del Restaurante
            </h3>
            <div className={`rounded-2xl border shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-colors ${
              isPaused
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
            }`}>
              {/* Toggle de Modo Hibernación */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <PauseCircle className={`w-5 h-5 ${
                    isPaused ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-200'
                  }`} strokeWidth={1.5} />
                  <span className={`text-sm font-medium ${
                    isPaused ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    Modo Hibernación
                  </span>
                </div>
                <button
                  onClick={handleTogglePause}
                  disabled={pauseLoading}
                  className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    isPaused ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${pauseLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={isPaused ? 'Desactivar modo hibernación' : 'Activar modo hibernación'}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    isPaused ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Descripción detallada */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Cuando el modo hibernación está activo:
                </p>
                <ul className="flex flex-col gap-1.5">
                  {[
                    'Tu restaurante seguirá visible para los clientes',
                    'Los clientes NO podrán realizar nuevos pedidos',
                    'Verán el mensaje: "No recibimos pedidos por el momento"',
                    'Puedes seguir gestionando tus pedidos existentes',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
                  Úsalo cuando estés saturado de pedidos o necesites una pausa temporal. Se restablece cuando lo desactives.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* App Version */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Versión 1.0.0
        </div>
      </div>
    </div>
  );
}
