import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router";
import { useAuthStore } from "@presentation/store/authStore";
import Input from "@presentation/components/common/Input";
import Button from "@presentation/components/common/Button";

const otpSchema = z.object({
  otp: z.string().length(6, "El código debe tener 6 dígitos"),
});

type OtpFormData = z.infer<typeof otpSchema>;

const OtpForm: React.FC = () => {
  const { verifyOtp, tempPhone } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data: OtpFormData) => {
    try {
      setError(null);
      await verifyOtp(data.otp);
      navigate("/");
    } catch {
      setError("Código de verificación inválido");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verificar Teléfono
        </h2>
        <p className="text-gray-600 text-sm">
          Enviamos un código de verificación a<br />
          <span className="font-semibold text-gray-900">{tempPhone}</span>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Código de verificación"
          type="text"
          inputMode="numeric"
          placeholder="Ingresa el código de 6 dígitos"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.otp?.message}
          {...register("otp")}
          className="text-center text-2xl tracking-widest font-semibold"
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
          Verificar Código
        </Button>
      </form>

      <div className="text-center text-sm">
        <button
          type="button"
          className="text-gray-600 hover:text-yellow-600 transition-colors font-medium"
        >
          ¿No recibiste el código? Reenviar
        </button>
      </div>
    </div>
  );
};

export default OtpForm;
