import { Outlet } from "react-router";

export default function RootLayout() {
  return (
    <div className="app-container">
      <Outlet />
    </div>
  );
}
