import {
  User,
  MapPin,
  CreditCard,
  Heart,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";

export default function Account() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const menuItems = [
    { icon: User, label: "Editar perfil", path: "/edit-profile" },
    { icon: MapPin, label: "Direcciones guardadas", path: "/saved-addresses" },
    { icon: CreditCard, label: "Métodos de pago", path: "/payment-methods" },
    { icon: Heart, label: "Favoritos", path: "/favorites" },
    { icon: Bell, label: "Notificaciones", path: "/notifications" },
    { icon: Settings, label: "Configuración", path: "/settings" },
  ];

  return (
    <div className="flex flex-col pt-2 pb-6">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        Cuenta
      </h2>

      <div className="flex flex-col gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-16 h-16 bg-amber-300/80 rounded-full flex items-center justify-center text-gray-800">
            <User className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Usuario</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">usuario@email.com</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 overflow-hidden">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index !== menuItems.length - 1 ? "border-b border-gray-100 dark:border-gray-700" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className="w-5 h-5 text-gray-700 dark:text-gray-200"
                  strokeWidth={1.5}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </Link>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="w-full bg-[#FF3B30] text-white font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2 mt-4 cursor-pointer hover:bg-[#E6352B] transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}