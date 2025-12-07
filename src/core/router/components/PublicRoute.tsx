import React from "react";
import { Navigate } from "react-router";
import { useAuthStore } from "@presentation/store/authStore";

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { status } = useAuthStore();

  // Only redirect if user is fully authenticated
  // Allow unauthenticated and pending_verification users to access public routes
  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  // User is not authenticated or pending verification, render the public content
  return <>{children}</>;
};

export default PublicRoute;
