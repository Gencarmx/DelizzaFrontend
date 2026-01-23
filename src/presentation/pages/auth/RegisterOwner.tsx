import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import { Eye, EyeOff, Upload } from "lucide-react";

export default function RegisterOwner() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUpOwner } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!licenseFile || !idFile || photos.length === 0) {
      setError("Debe subir todos los documentos requeridos");
      return;
    }

    setLoading(true);

    const { error } = await signUpOwner(
      email,
      password,
      fullName,
      businessName,
      businessAddress,
      phoneNumber
    );

    if (error) {
      // Parse error message to provide user-friendly feedback with specific field information
      let errorMessage = error.message;
      const originalError = errorMessage.toLowerCase();

      // Check for duplicate email
      if (originalError.includes("user already registered") || 
          (originalError.includes("email") && originalError.includes("already"))) {
        errorMessage = `❌ El correo electrónico "${email}" ya está registrado. Por favor usa otro correo o inicia sesión.`;
      }
      // Check for duplicate phone number
      else if (originalError.includes("users_phone_number_key") || 
               (originalError.includes("phone") && originalError.includes("duplicate"))) {
        errorMessage = `❌ El número de teléfono "${phoneNumber}" ya está registrado. Por favor usa otro número.`;
      }
      // Check for both duplicates (if error message contains both)
      else if (originalError.includes("duplicate") && 
               (originalError.includes("email") || originalError.includes("phone"))) {
        // Try to determine which fields are duplicated
        const duplicatedFields = [];
        if (originalError.includes("email")) duplicatedFields.push(`correo "${email}"`);
        if (originalError.includes("phone")) duplicatedFields.push(`teléfono "${phoneNumber}"`);
        
        if (duplicatedFields.length > 0) {
          errorMessage = `❌ Los siguientes datos ya están registrados: ${duplicatedFields.join(" y ")}. Por favor usa otros datos.`;
        } else {
          errorMessage = "❌ Algunos datos ya están registrados. Por favor verifica el correo y número de teléfono.";
        }
      }
      // Check for database errors
      else if (originalError.includes("database error")) {
        errorMessage = "❌ Error al crear la cuenta. Por favor verifica que el correo y número de teléfono no estén ya registrados.";
      }
      // Generic network error
      else if (originalError.includes("failed to fetch") || originalError.includes("network")) {
        errorMessage = "❌ Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.";
      }
      // Keep original error if we can't parse it
      else if (!errorMessage.startsWith("❌")) {
        errorMessage = `❌ ${errorMessage}`;
      }

      setError(errorMessage);
      setLoading(false);
    } else {
      // Navigate to pending approval page
      navigate("/pending-approval");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0] || null;
    setter(file);
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(files);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Registro de Restaurante
        </h1>
        <p className="text-gray-500 text-base">
          Registra tu restaurante para comenzar
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Full Name Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              required
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Email Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all pr-12"
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
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all pr-12"
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
          </div>

          {/* Business Name Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="businessName" className="text-sm font-medium text-gray-700">
              Nombre del restaurante
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Mi Restaurante S.A."
              required
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Business Address Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="businessAddress" className="text-sm font-medium text-gray-700">
              Dirección del restaurante
            </label>
            <input
              id="businessAddress"
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="Calle Principal 123, Ciudad"
              required
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Phone Number Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
              Número de teléfono
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              required
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Documents Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Documentos Requeridos</h3>

            {/* License Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Licencia comercial
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, setLicenseFile)}
                  className="hidden"
                  id="license"
                  required
                />
                <label
                  htmlFor="license"
                  className="flex items-center gap-3 w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {licenseFile ? licenseFile.name : "Seleccionar archivo"}
                  </span>
                </label>
              </div>
            </div>

            {/* ID Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Identificación personal
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, setIdFile)}
                  className="hidden"
                  id="id"
                  required
                />
                <label
                  htmlFor="id"
                  className="flex items-center gap-3 w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {idFile ? idFile.name : "Seleccionar archivo"}
                  </span>
                </label>
              </div>
            </div>

            {/* Photos Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Fotos del restaurante
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotosChange}
                  className="hidden"
                  id="photos"
                  required
                />
                <label
                  htmlFor="photos"
                  className="flex items-center gap-3 w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {photos.length > 0 ? `${photos.length} archivo(s) seleccionado(s)` : "Seleccionar archivos"}
                  </span>
                </label>
              </div>
            </div>
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
            {loading ? "Registrando..." : "Registrar Restaurante"}
          </button>
        </form>

        {/* Sign In Link */}
        <div className="text-center mt-8 mb-8">
          <span className="text-gray-600">¿Ya tienes una cuenta? </span>
          <Link
            to="/login"
            className="text-amber-500 hover:text-amber-600 font-semibold transition-colors"
          >
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
