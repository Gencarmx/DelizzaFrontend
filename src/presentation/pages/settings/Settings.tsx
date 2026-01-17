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
  Store,
  Clock,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useState } from "react";
import { useTheme } from "@core/context";

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
  const { effectiveTheme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [active, setActive] = useState(true);

  // Determine context based on URL
  const isRestaurant = location.pathname.includes("/restaurant");

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
          // In a real app, this would trigger signOut()
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
          icon: Store,
          label: "Estado del restaurante",
          type: "toggle",
          value: active,
          onChange: setActive,
        },
        {
          icon: Globe,
          label: "Información del negocio",
          type: "link",
        },
        {
          icon: Clock,
          label: "Horarios de atención",
          type: "link",
        },
      ],
    },
    {
      title: "Pedidos",
      items: [
        {
          icon: Bell,
          label: "Notificaciones de pedidos",
          type: "toggle",
          value: notificationsEnabled,
          onChange: setNotificationsEnabled,
        },
      ],
    },
  ];

  const settingsSections = [
    ...(isRestaurant ? restaurantSections : clientSections),
    ...commonSections,
  ];

  return (
    <div className="flex flex-col pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
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
                  className={`flex items-center justify-between p-4 ${
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
                        item.danger ? "text-red-500" : "text-gray-700 dark:text-gray-200"
                      }`}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`text-sm font-medium ${
                        item.danger ? "text-red-500" : "text-gray-700 dark:text-gray-200"
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
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* App Version */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Versión 1.0.0
        </div>
      </div>
    </div>
  );
}
