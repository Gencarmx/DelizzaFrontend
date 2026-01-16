import { Navigate, Outlet } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children?: ReactNode;
}

export const ProtectedRoute = ({
  allowedRoles,
  children,
}: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    // You might want to replace this with a proper LoadingSpinner component if available
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    if (role === "owner") {
      return <Navigate to="/restaurant/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
