import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Mail, ChevronLeft, Send, CheckCircle } from "lucide-react";
import { useAuth } from "@core/context/AuthContext";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    const { error } = await forgotPassword(email.trim().toLowerCase());

    // Por seguridad mostramos siempre éxito aunque el email no exista,
    // para no revelar qué cuentas están registradas.
    if (error && error.message.toLowerCase().includes("rate limit")) {
      setError("Demasiados intentos. Por favor espera unos minutos antes de intentarlo de nuevo.");
    } else {
      setIsSuccess(true);
    }

    setIsLoading(false);
  };

  // ── Estado de éxito ──────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Revisa tu correo
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-2">
            Si existe una cuenta asociada a{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{email}</span>,
            recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-8">
            Revisa también tu carpeta de spam si no lo encuentras.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Volver a iniciar sesión
          </button>
          <button
            onClick={() => { setIsSuccess(false); setEmail(""); }}
            className="mt-3 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 transition-colors"
          >
            Usar otro correo
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Volver al inicio de sesión</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {/* Icon */}
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Ingresa el correo electrónico de tu cuenta y te enviaremos un enlace
            para que puedas crear una nueva contraseña.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="correo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar enlace de recuperación</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
