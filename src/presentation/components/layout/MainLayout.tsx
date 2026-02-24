import { Outlet } from "react-router";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { NotificationPermissionBanner } from "@presentation/components/common/NotificationPermissionBanner";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans">
      <Header />
      <NotificationPermissionBanner />
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
