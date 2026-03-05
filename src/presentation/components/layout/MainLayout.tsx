import { Outlet } from "react-router";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { NotificationPermissionBanner } from "@presentation/components/common/NotificationPermissionBanner";
import { IOSInstallBanner } from "@presentation/components/common/IOSInstallBanner";
import { AndroidInstallButton } from "@presentation/components/common/AndroidInstallButton";
import { useCustomerNotificationsContext } from "@core/context/CustomerNotificationsContext";
import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

export function MainLayout() {
  const { registerInAppNotificationCallback } = useCustomerNotificationsContext();
  const [inAppNotification, setInAppNotification] = useState<{
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    registerInAppNotificationCallback((title, body) => {
      setInAppNotification({ title, body });
      setTimeout(() => setInAppNotification(null), 5000);
    });

    return () => {
      registerInAppNotificationCallback(null);
    };
  }, [registerInAppNotificationCallback]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans relative">
      <Header />
      <NotificationPermissionBanner />
      <IOSInstallBanner />

      {/* Global InApp Notifications */}
      {inAppNotification && (
        <div className="absolute top-16 right-4 left-auto w-[calc(100%-2rem)] sm:w-80 max-w-sm z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-start justify-between shadow-lg">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-full shrink-0">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {inAppNotification.title}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {inAppNotification.body}
                </span>
              </div>
            </div>
            <button
              onClick={() => setInAppNotification(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <AndroidInstallButton />
    </div>
  );
}