import React from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "@presentation/store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status } = useAuthStore();

  // If user is not authenticated, redirect to login
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  // If user is pending verification, redirect to register (which will show OTP form)
  if (status === "pending_verification") {
    return <Navigate to="/register" replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
