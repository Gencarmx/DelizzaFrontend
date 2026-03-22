import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@core/supabase/client";
import { useAuth } from "@core/context/AuthContext";

type PageState = "loading" | "form" | "success" | "invalid";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, signOut } = useAuth();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase con detectSessionInUrl:true procesa automáticamente el fragment
  // de la URL (#access_token=...&type=recovery) y establece la sesión.
  // Escuchamos PASSWORD_RECOVERY para saber cuándo está lista.
  useEffect(() => {
    // Primero revisamos si ya hay una sesión activa (puede haberse procesado antes del montaje)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState("form");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("form");
      } else if (event === "SIGNED_OUT") {
        setPageState("invalid");
      }
    });

    // Timeout de seguridad: si en 5 segundos no hay sesión, el enlace es inválido
    const timeout = setTimeout(() => {
      setPageState((prev) => (prev === "loading" ? "invalid" : prev));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    const { error } = await updatePassword(password);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("same password")) {
        setError("La nueva contraseña debe ser diferente a la actual.");
      } else if (msg.includes("session") || msg.includes("token")) {
        setError("El enlace de recuperación ha expirado. Solicita uno nuevo.");
        setPageState("invalid");
      } else {
        setError("Ocurrió un error al actualizar la contraseña. Intenta de nuevo.");
      }
      setIsLoading(false);
      return;
    }

    // Cerrar la sesión temporal de recuperación antes de redirigir
    await signOut();
    setPageState("success");
  };

  // ── Cargando ─────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // ── Enlace inválido o expirado ────────────────────────────────────────────
  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Enlace inválido o expirado
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            El enlace de recuperación no es válido o ya caducó. Los enlaces
            expiran a los 60 minutos de ser generados y solo pueden usarse una
            vez.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Solicitar un nuevo enlace
          </button>
          <button
            onClick={() => navigate("/login")}
            className="mt-3 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Contraseña actualizada con éxito ─────────────────────────────────────
  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            ¡Contraseña actualizada!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Tu contraseña se ha restablecido correctamente. Ya puedes iniciar
            sesión con tu nueva contraseña.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordTooShort = password.length > 0 && password.length < 8;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {/* Icon */}
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Nueva contraseña
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Elige una contraseña segura de al menos 8 caracteres. No la compartas
            con nadie.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nueva contraseña */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full pl-10 pr-10 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-sm ${
                    passwordTooShort
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordTooShort && (
                <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres.</p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repite tu nueva contraseña"
                  className={`w-full pl-10 pr-10 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-sm ${
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "border-red-300 dark:border-red-700"
                      : confirmPassword.length > 0 && passwordsMatch
                      ? "border-green-400 dark:border-green-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Las contraseñas coinciden.
                </p>
              )}
            </div>

            {/* Error general */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                "Establecer nueva contraseña"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
