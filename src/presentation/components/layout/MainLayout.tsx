import { Outlet } from "react-router";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
