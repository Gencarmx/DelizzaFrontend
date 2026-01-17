import { Bell, Package, Tag, Star, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

export default function Notifications() {
  const navigate = useNavigate();

  const notifications = [
    {
      id: 1,
      icon: Package,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      title: "Pedido entregado",
      message: "Tu pedido de China food express ha sido entregado",
      time: "Hace 5 min",
      unread: true,
    },
    {
      id: 2,
      icon: Tag,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      title: "Nueva promoción",
      message: "20% de descuento en Tio hamburguesas",
      time: "Hace 1 hora",
      unread: true,
    },
    {
      id: 3,
      icon: Star,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      title: "Califica tu pedido",
      message: "¿Cómo estuvo tu experiencia con Kinich?",
      time: "Hace 2 horas",
      unread: false,
    },
    {
      id: 4,
      icon: Package,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      title: "Pedido en camino",
      message: "Tu pedido llegará en 15 minutos",
      time: "Hace 3 horas",
      unread: false,
    },
    {
      id: 5,
      icon: Bell,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      title: "Recordatorio",
      message: "Tienes un cupón por vencer mañana",
      time: "Ayer",
      unread: false,
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
        <h2 className="font-bold text-lg text-gray-900">Notificaciones</h2>
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${
              notification.unread ? "border-l-4 border-l-amber-400" : ""
            }`}
          >
            <div
              className={`w-12 h-12 ${notification.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}
            >
              <notification.icon
                className={`w-6 h-6 ${notification.iconColor}`}
                strokeWidth={2}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {notification.title}
                </h3>
                {notification.unread && (
                  <div className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0 mt-1" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {notification.message}
              </p>
              <span className="text-xs text-gray-400">{notification.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State (hidden when there are notifications) */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-gray-900 text-lg mb-2">
            No hay notificaciones
          </h3>
          <p className="text-sm text-gray-500 text-center">
            Cuando tengas nuevas notificaciones aparecerán aquí
          </p>
        </div>
      )}
    </div>
  );
}
