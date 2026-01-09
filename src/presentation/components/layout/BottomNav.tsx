import { Home, Heart, Activity, User } from "lucide-react";
import { Link, useLocation } from "react-router";

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: Heart, label: "Favoritos", path: "/favorites" },
    { icon: Activity, label: "Actividad", path: "/activity" },
    { icon: User, label: "Cuenta", path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-safe">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive(item.path)
              ? "text-amber-400"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <item.icon
            className={`w-6 h-6 ${isActive(item.path) ? "fill-current" : ""}`}
            strokeWidth={isActive(item.path) ? 2.5 : 2}
          />
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
