import { Outlet } from "react-router";
import { RestaurantBottomNav } from "@presentation/components/layout/RestaurantBottomNav";

export default function RestaurantLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Logo */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
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
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <RestaurantBottomNav />
    </div>
  );
}
