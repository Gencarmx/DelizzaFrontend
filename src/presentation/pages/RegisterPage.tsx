import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@presentation/store/authStore";
import RegisterForm from "@presentation/components/auth/RegisterForm";
import OtpForm from "@presentation/components/auth/OtpForm";

const RegisterPage: React.FC = () => {
  const { status } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  // If pending verification, show OTP form
  if (status === "pending_verification") {
    return <OtpForm />;
  }

  return <RegisterForm />;
};

export default RegisterPage;
