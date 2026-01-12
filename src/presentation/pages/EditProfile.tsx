import { ChevronLeft, User, Camera, Mail, Phone, Calendar } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

export default function EditProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "Juan Pérez",
    email: "usuario@email.com",
    phone: "+52 999 123 4567",
    birthdate: "1990-05-15",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Save logic here
    console.log("Saving profile:", formData);
    navigate(-1);
  };

  return (
    <div className="flex flex-col pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white sticky top-0 z-10 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="font-bold text-lg text-gray-900">Editar perfil</h2>
        </div>
        <button
          onClick={handleSave}
          className="text-amber-400 font-semibold text-sm hover:text-amber-500 transition-colors"
        >
          Guardar
        </button>
      </div>

      {/* Profile Picture */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 bg-amber-300/80 rounded-full flex items-center justify-center text-gray-800">
            <User className="w-12 h-12" strokeWidth={1.5} />
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg hover:bg-amber-500 transition-colors">
            <Camera className="w-4 h-4 text-white" strokeWidth={2} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">Toca para cambiar foto</p>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-4">
        {/* Name Field */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <label className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">Nombre completo</div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
                placeholder="Ingresa tu nombre"
              />
            </div>
          </label>
        </div>

        {/* Email Field */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <label className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">
                Correo electrónico
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </label>
        </div>

        {/* Phone Field */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <label className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">Teléfono</div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
                placeholder="+52 999 123 4567"
              />
            </div>
          </label>
        </div>

        {/* Birthdate Field */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
          <label className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">
                Fecha de nacimiento
              </div>
              <input
                type="date"
                value={formData.birthdate}
                onChange={(e) => handleChange("birthdate", e.target.value)}
                className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none"
              />
            </div>
          </label>
        </div>
      </div>

      {/* Info Message */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-800">
            Mantén tu información actualizada.
          </span>{" "}
          Esto nos ayuda a brindarte un mejor servicio y mantener tu cuenta
          segura.
        </p>
      </div>

      {/* Delete Account Link */}
      <button className="mt-6 text-center text-sm text-red-500 font-medium hover:text-red-600 transition-colors">
        Eliminar mi cuenta
      </button>
    </div>
  );
}
