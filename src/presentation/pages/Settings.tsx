import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Globe,
  Moon,
  Shield,
  HelpCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const settingsSections: { title: string; items: SettingItem[] }[] = [
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
          onChange: setDarkMode,
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
    {
      title: "Cuenta",
      items: [
        {
          icon: Trash2,
          label: "Eliminar cuenta",
          type: "link",
          danger: true,
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 bg-white sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="font-bold text-lg text-gray-900">Configuración</h2>
      </div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h3>
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className={`flex items-center justify-between p-4 ${
                    itemIndex !== section.items.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  } ${
                    item.type === "link"
                      ? "hover:bg-gray-50 cursor-pointer"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-5 h-5 ${
                        item.danger ? "text-red-500" : "text-gray-700"
                      }`}
                      strokeWidth={1.5}
                    />
                    <span
                      className={`text-sm font-medium ${
                        item.danger ? "text-red-500" : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {item.type === "toggle" && (
                    <button
                      onClick={() =>
                        item.onChange?.(!(item.value as boolean))
                      }
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
                        <span className="text-sm text-gray-500">
                          {item.value}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* App Version */}
        <div className="text-center text-xs text-gray-400 mt-4">
          Versión 1.0.0
        </div>
      </div>
    </div>
  );
}
