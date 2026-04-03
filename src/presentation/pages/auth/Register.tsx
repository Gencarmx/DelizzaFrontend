import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import { Eye, EyeOff, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "El nombre completo es requerido"),
    phone: z
      .string()
      .min(1, "El número de teléfono es requerido")
      .regex(
        /^\+[1-9][\d\s\-]{6,18}$/,
        "Incluye el código de país, ej: +52 999 123 4567"
      ),
    email: z.email("Formato de correo inválido"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError("");
    setLoading(true);

    const { error } = await signUp(data.email, data.password, data.fullName, data.phone);

    if (error) {
      // Parse error message to provide user-friendly feedback with specific field information
      let errorMessage = error.message;
      const originalError = errorMessage.toLowerCase();

      // Check for duplicate email
      if (
        originalError.includes("user already registered") ||
        (originalError.includes("email") && originalError.includes("already"))
      ) {
        errorMessage = `❌ El correo electrónico "${data.email}" ya está registrado. Por favor usa otro correo o inicia sesión.`;
      }
      // Check for duplicate phone number (aunque clientes no tienen teléfono, por consistencia)
      else if (
        originalError.includes("users_phone_number_key") ||
        (originalError.includes("phone") && originalError.includes("duplicate"))
      ) {
        errorMessage = `❌ Este número de teléfono ya está registrado. Por favor usa otro número.`;
      }
      // Check for both duplicates
      else if (
        originalError.includes("duplicate") &&
        (originalError.includes("email") || originalError.includes("phone"))
      ) {
        const duplicatedFields = [];
        if (originalError.includes("email"))
          duplicatedFields.push(`correo "${data.email}"`);
        if (originalError.includes("phone")) duplicatedFields.push("teléfono");

        if (duplicatedFields.length > 0) {
          errorMessage = `❌ Los siguientes datos ya están registrados: ${duplicatedFields.join(" y ")}. Por favor usa otros datos.`;
        } else {
          errorMessage =
            "❌ Algunos datos ya están registrados. Por favor verifica el correo electrónico.";
        }
      }
      // Check for database errors
      else if (originalError.includes("database error")) {
        errorMessage =
          "❌ Error al crear la cuenta. Por favor verifica que el correo electrónico no esté ya registrado.";
      }
      // Generic network error
      else if (
        originalError.includes("failed to fetch") ||
        originalError.includes("network")
      ) {
        errorMessage =
          "❌ Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.";
      }
      // Password too weak
      else if (
        originalError.includes("password") &&
        (originalError.includes("weak") || originalError.includes("short"))
      ) {
        errorMessage =
          "❌ La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
      // Invalid email format
      else if (
        originalError.includes("invalid") &&
        originalError.includes("email")
      ) {
        errorMessage = `❌ El correo electrónico "${data.email}" no es válido. Por favor verifica el formato.`;
      }
      // Keep original error if we can't parse it, but add emoji
      else if (!errorMessage.startsWith("❌")) {
        errorMessage = `❌ ${errorMessage}`;
      }

      setError(errorMessage);
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(`❌ Error al registrarse con Google: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
        <p className="text-gray-500 text-base">Regístrate para comenzar</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Full Name Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-gray-700"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              {...register("fullName")}
              placeholder="Juan Pérez"
              autoComplete="name"
              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all ${
                formErrors.fullName ? "border-red-300" : "border-gray-200"
              }`}
            />
            {formErrors.fullName && (
              <span className="text-sm text-red-500">
                {formErrors.fullName.message}
              </span>
            )}
          </div>

          {/* Phone Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700"
            >
              Número de teléfono <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                {...register("phone")}
                placeholder="+52 999 123 4567"
                autoComplete="tel"
                className={`w-full pl-10 pr-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all ${
                  formErrors.phone ? "border-red-300" : "border-gray-200"
                }`}
              />
            </div>
            <p className="text-xs text-gray-500">
              Incluye el código de tu país · Ej: +52 (México), +1 (USA), +34 (España)
            </p>
            {formErrors.phone && (
              <span className="text-sm text-red-500">
                {formErrors.phone.message}
              </span>
            )}
          </div>

          {/* Email Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              placeholder="ejemplo@correo.com"
              autoComplete="email"
              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all ${
                formErrors.email ? "border-red-300" : "border-gray-200"
              }`}
            />
            {formErrors.email && (
              <span className="text-sm text-red-500">
                {formErrors.email.message}
              </span>
            )}
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all pr-12 ${
                  formErrors.password ? "border-red-300" : "border-gray-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {formErrors.password && (
              <span className="text-sm text-red-500">
                {formErrors.password.message}
              </span>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all pr-12 ${
                  formErrors.confirmPassword
                    ? "border-red-300"
                    : "border-gray-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {formErrors.confirmPassword && (
              <span className="text-sm text-red-500">
                {formErrors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-4 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          {/* Legal acceptance note */}
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Al crear tu cuenta aceptas nuestros{" "}
            <Link
              to="/terms"
              className="text-amber-500 hover:text-amber-600 underline underline-offset-2 transition-colors"
            >
              Términos y Condiciones
            </Link>{" "}
            y nuestras{" "}
            <Link
              to="/privacy"
              className="text-amber-500 hover:text-amber-600 underline underline-offset-2 transition-colors"
            >
              Políticas de Privacidad
            </Link>
            .
          </p>
        </form>

        {/* Restaurant Registration Button */}
        <div className="mt-6">
          <Link
            to="/register-owner"
            className="w-full bg-white border-2 border-amber-400 text-amber-600 font-semibold py-4 rounded-xl shadow-sm hover:bg-amber-50 transition-all flex items-center justify-center gap-3"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Registrar Restaurante
          </Link>
          <p className="text-center text-sm text-gray-500 mt-2">
            Para propietarios de establecimientos
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-sm text-gray-400">o</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Social Login Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </button>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-8 mb-4">
          <span className="text-gray-600">¿Ya tienes una cuenta? </span>
          <Link
            to="/login"
            className="text-amber-500 hover:text-amber-600 font-semibold transition-colors"
          >
            Inicia sesión
          </Link>
        </div>

        {/* Legal Links */}
        <div className="text-center mb-8 flex items-center justify-center gap-1 flex-wrap">
          <Link
            to="/terms"
            className="text-xs text-gray-400 hover:text-amber-500 transition-colors underline underline-offset-2"
          >
            Términos y Condiciones
          </Link>
          <span className="text-xs text-gray-300">·</span>
          <Link
            to="/privacy"
            className="text-xs text-gray-400 hover:text-amber-500 transition-colors underline underline-offset-2"
          >
            Políticas de Privacidad
          </Link>
        </div>
      </div>
    </div>
  );
}
