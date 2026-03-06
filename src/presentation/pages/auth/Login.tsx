import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es requerido")
    .email("Formato de correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, user, role, businessActive } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    console.log(
      "🔐 [Login] Redirect check - user:",
      user?.id,
      "role:",
      role,
      "businessActive:",
      businessActive,
    );
    if (user && role) {
      if (role === "owner") {
        // Wait until businessActive is resolved (not null)
        if (businessActive === null) {
          console.log(
            "🔐 [Login] Owner detected, waiting for businessActive to resolve...",
          );
          return;
        }
        if (businessActive === false) {
          console.log("🔐 [Login] Redirecting to pending-approval");
          navigate("/pending-approval", { replace: true });
        } else {
          console.log("🔐 [Login] Redirecting to restaurant dashboard");
          navigate("/restaurant/dashboard", { replace: true });
        }
      } else if (role === "client") {
        console.log("🔐 [Login] Redirecting to home");
        navigate("/", { replace: true });
      }
    } else {
      console.log("🔐 [Login] Missing user or role, staying on login page");
    }
  }, [user, role, businessActive, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    setError("");
    setLoading(true);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      // Parse error message to provide user-friendly feedback
      let errorMessage = error.message;
      const originalError = errorMessage.toLowerCase();

      // Check for invalid credentials
      if (
        originalError.includes("invalid") &&
        (originalError.includes("credentials") ||
          originalError.includes("login"))
      ) {
        errorMessage =
          "❌ Correo electrónico o contraseña incorrectos. Por favor verifica tus datos.";
      }
      // Check for email not confirmed
      else if (
        originalError.includes("email") &&
        originalError.includes("confirm")
      ) {
        errorMessage =
          "❌ Por favor confirma tu correo electrónico antes de iniciar sesión.";
      }
      // Check for user not found
      else if (
        originalError.includes("user") &&
        originalError.includes("not found")
      ) {
        errorMessage = `❌ No existe una cuenta con el correo "${data.email}". Por favor regístrate primero.`;
      }
      // Generic network error
      else if (
        originalError.includes("failed to fetch") ||
        originalError.includes("network")
      ) {
        errorMessage =
          "❌ Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.";
      }
      // Keep original error if we can't parse it, but add emoji
      else if (!errorMessage.startsWith("❌")) {
        errorMessage = `❌ ${errorMessage}`;
      }

      setError(errorMessage);
      setLoading(false);
    } else {
      // Don't navigate here - let the useEffect handle it based on role
      // The role will be available after signIn completes
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(`❌ Error al iniciar sesión con Google: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Hola de nuevo</h1>
        <p className="text-gray-500 text-base">Inicia sesión para continuar</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
                autoComplete="current-password"
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

          {/* Forgot Password */}
          <div className="flex justify-end -mt-2">
            <Link
              to="/forgot-password"
              className="text-sm text-amber-500 hover:text-amber-600 font-medium transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
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
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

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

        {/* Sign Up Link */}
        <div className="text-center mt-8 mb-8">
          <span className="text-gray-600">¿No tienes una cuenta? </span>
          <Link
            to="/register"
            className="text-amber-500 hover:text-amber-600 font-semibold transition-colors"
          >
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
