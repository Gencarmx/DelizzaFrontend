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

  // Mostrar spinner mientras la sesión o el rol no están resueltos.
  // Esto cubre dos casos:
  //   1. Carga inicial (isAuthReady = false)
  //   2. Re-disparo de onAuthStateChange donde user ya existe pero role
  //      aún está en null (applySession corriendo de forma asíncrona).
  //      Sin este guard, el ProtectedRoute evalúa las redirecciones con
  //      role = null y puede dejar pasar o redirigir incorrectamente.
  if (!isAuthReady || (user && role === null)) {
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
    if (role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (role === "owner") {
      return <Navigate to="/restaurant/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (role === "owner" && businessActive === false && location.pathname !== "/pending-approval") {
    return <Navigate to="/pending-approval" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};