import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  LogOut,
} from "lucide-react";

export default function RestaurantLayout() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/restaurant/dashboard",
    },
    { icon: Package, label: "Productos", path: "/restaurant/products" },
    { icon: ShoppingBag, label: "Pedidos", path: "/restaurant/orders" },
    { icon: Settings, label: "Configuración", path: "/restaurant/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
              D
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl leading-none text-gray-900">
                LIZZA
              </span>
              <span className="text-[10px] text-gray-400 tracking-wider">
                RESTAURANTE
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path)
                      ? "bg-amber-50 text-amber-600 font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon
                    className="w-5 h-5"
                    strokeWidth={isActive(item.path) ? 2.5 : 2}
                  />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
