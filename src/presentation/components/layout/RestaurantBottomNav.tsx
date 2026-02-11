import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";

export function RestaurantBottomNav() {
  const location = useLocation();
  const { hasNewOrder, orderCount, markAsRead } = useRestaurantNotifications();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/restaurant/dashboard",
    },
    { icon: Package, label: "Productos", path: "/restaurant/products" },
    { 
      icon: ShoppingBag, 
      label: "Pedidos", 
      path: "/restaurant/orders",
      showBadge: hasNewOrder,
      badgeCount: orderCount,
    },
    { icon: Settings, label: "Configuración", path: "/restaurant/settings" },
  ];

  const handleNavClick = (path: string) => {
    // Marcar notificaciones como leídas al navegar a pedidos
    if (path === "/restaurant/orders" && hasNewOrder) {
      markAsRead();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-6 py-3 flex justify-between items-center z-50 pb-safe shadow-lg">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => handleNavClick(item.path)}
          className={`flex flex-col items-center gap-1 transition-colors relative ${
            isActive(item.path)
              ? "text-amber-500"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <div className="relative">
            <item.icon
              className={`w-6 h-6 ${isActive(item.path) ? "fill-current" : ""}`}
              strokeWidth={isActive(item.path) ? 2.5 : 2}
            />
            {/* Badge de notificación */}
            {item.showBadge && item.badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {item.badgeCount > 9 ? '9+' : item.badgeCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
