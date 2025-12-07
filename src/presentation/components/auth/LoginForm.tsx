import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "@presentation/store/authStore";
import Input from "@presentation/components/common/Input";
import Button from "@presentation/components/common/Button";

const loginSchema = z.object({
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
      navigate("/");
    } catch {
      setError("Teléfono o contraseña incorrectos");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Iniciar Sesión
        </h2>
        <p className="text-gray-600 text-sm">
          Ingresa tus datos para continuar
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Número de teléfono"
          type="tel"
          placeholder="Ingresa tu teléfono"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full mt-6">
          Iniciar Sesión
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-gray-600">¿No tienes cuenta? </span>
        <Link
          to="/register"
          className="font-semibold text-yellow-600 hover:text-yellow-700 transition-colors"
        >
          Regístrate aquí
        </Link>
      </div>
    </div>
  );
};

export default LoginForm;
