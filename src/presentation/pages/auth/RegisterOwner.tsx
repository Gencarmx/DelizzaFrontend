import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import { Eye, EyeOff, Upload, Image as ImageIcon, X } from "lucide-react";
import { getBusinessByOwner, uploadBusinessLogo, updateBusiness } from "@core/services/businessService";

export default function RegisterOwner() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [restaurantPhoto, setRestaurantPhoto] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUpOwner, user } = useAuth();
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

    if (!restaurantPhoto) {
      setError("Debe subir una foto del restaurante");
      return;
    }

    setLoading(true);

    const { error: signUpError, userId: newUserId } = await signUpOwner(
      email,
      password,
      fullName,
      businessName,
      businessAddress,
      phoneNumber
    );

    if (signUpError) {
      let errorMessage = signUpError.message;
      const originalError = errorMessage.toLowerCase();

      if (originalError.includes("user already registered") ||
        (originalError.includes("email") && originalError.includes("already"))) {
        errorMessage = `❌ El correo electrónico "${email}" ya está registrado. Por favor usa otro correo o inicia sesión.`;
      }
      else if (originalError.includes("users_phone_number_key") ||
        (originalError.includes("phone") && originalError.includes("duplicate"))) {
        errorMessage = `❌ El número de teléfono "${phoneNumber}" ya está registrado. Por favor usa otro número.`;
      }
      else if (originalError.includes("duplicate") &&
        (originalError.includes("email") || originalError.includes("phone"))) {
        const duplicatedFields = [];
        if (originalError.includes("email")) duplicatedFields.push(`correo "${email}"`);
        if (originalError.includes("phone")) duplicatedFields.push(`teléfono "${phoneNumber}"`);

        if (duplicatedFields.length > 0) {
          errorMessage = `❌ Los siguientes datos ya están registrados: ${duplicatedFields.join(" y ")}. Por favor usa otros datos.`;
        } else {
          errorMessage = "❌ Algunos datos ya están registrados. Por favor verifica el correo y número de teléfono.";
        }
      }
      else if (originalError.includes("database error")) {
        errorMessage = "❌ Error al crear la cuenta. Por favor verifica que el correo y número de teléfono no estén ya registrados.";
      }
      else if (originalError.includes("failed to fetch") || originalError.includes("network")) {
        errorMessage = "❌ Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.";
      }
      else if (!errorMessage.startsWith("❌")) {
        errorMessage = `❌ ${errorMessage}`;
      }

      setError(errorMessage);
      setLoading(false);
    } else {
      try {
        const ownerUserId = newUserId || user?.id;
        if (ownerUserId && restaurantPhoto) {
          const business = await getBusinessByOwner(ownerUserId);
          if (business) {
            const logoUrl = await uploadBusinessLogo(business.id, restaurantPhoto);
            await updateBusiness(business.id, { logo_url: logoUrl });
          }
        }
      } catch (uploadError) {
        console.error('Error subiendo logo del restaurante:', uploadError);
      }

      navigate("/pending-approval");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen del restaurante no debe superar los 5MB');
      return;
    }

    setError("");
    setRestaurantPhoto(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setRestaurantPhoto(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

          {/* Restaurant Photo Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Foto del restaurante
            </label>

            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview del logo"
                    className="w-32 h-32 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Sin foto</p>
                  </div>
                </div>
              )}

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="restaurantPhoto"
                  required={!restaurantPhoto}
                />
                <label
                  htmlFor="restaurantPhoto"
                  className="inline-flex items-center gap-3 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all text-gray-600 font-medium w-full"
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span>
                    {imagePreview ? 'Cambiar foto' : 'Seleccionar archivo'}
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 5MB
                </p>
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
