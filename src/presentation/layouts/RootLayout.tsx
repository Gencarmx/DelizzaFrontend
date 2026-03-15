import { MainLayout } from "../components/layout/MainLayout";
import { CustomerNotificationsProvider } from "@core/context/CustomerNotificationsContext";

export default function RootLayout() {
  return (
    <CustomerNotificationsProvider>
      <MainLayout />
    </CustomerNotificationsProvider>
  );
}
