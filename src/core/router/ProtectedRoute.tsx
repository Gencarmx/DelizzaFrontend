import { Navigate, Outlet, useLocation } from "react-router";
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
  const { user, role, businessActive, isAuthReady } = useAuth();
  const location = useLocation();

  // Wait for auth to be ready before making any decisions
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // After auth is ready, check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    if (role === "owner") {
      return <Navigate to="/restaurant/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Check if owner's business is not active and trying to access routes other than pending-approval
  if (role === "owner" && businessActive === false && location.pathname !== "/pending-approval") {
    return <Navigate to="/pending-approval" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
