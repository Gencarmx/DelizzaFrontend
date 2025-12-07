import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@presentation/store/authStore";
import LoginForm from "@presentation/components/auth/LoginForm";

const LoginPage: React.FC = () => {
  const { status } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  return <LoginForm />;
};

export default LoginPage;
