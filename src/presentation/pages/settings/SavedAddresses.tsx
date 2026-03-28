import {
  ChevronLeft,
  MapPin,
  Home,
  Briefcase,
  Plus,
  MoreVertical,
  Check,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "@core/context";
import { useAddress } from "@core/context/AddressContext";
import { addressService, type Address } from "@core/services/addressService";
import { supabase } from "@core/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const addressSchema = z.object({
  label: z.string().min(1, "La etiqueta es requerida"),
  line1: z.string().min(1, "La dirección es requerida"),
  line2: z.string().min(1, "La colonia / referencia es requerida para un mejor servicio de reparto"),
  city: z.string().min(1, "La ciudad es requerida"),
  state: z.string().min(1, "El estado es requerido"),
  postal_code: z.string().optional(),
  country: z.string().min(1, "El país es requerido"),
  recipient_name: z.string().optional(),
  phone: z.string().optional(),
});

type AddressFormValues = z.infer<typeof addressSchema>;

const getIconForType = (type: string) => {
  switch (type.toLowerCase()) {
    case "casa":
    case "home":
      return Home;
    case "trabajo":
    case "work":
      return Briefcase;
    default:
      return MapPin;
  }
};

export default function SavedAddresses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addresses, loading, selectedAddress, refreshAddresses } = useAddress();
  
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "México",
      recipient_name: "",
      phone: "",
    },
  });

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta dirección?")) {
      return;
    }

    try {
      await addressService.deleteAddress(id);
      await refreshAddresses();
      setShowMenu(null);
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("Error al eliminar la dirección");
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        await addressService.setDefaultAddress(id, profile.id);
        await refreshAddresses();
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      alert("Error al establecer dirección predeterminada");
    }
  };

  const handleOpenForm = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      reset({
        label: address.label,
        line1: address.line1,
        line2: address.line2 || "",
        city: address.city,
        state: address.state,
        postal_code: address.postal_code || "",
        country: address.country,
        recipient_name: address.recipient_name || "",
        phone: address.phone || "",
      });
    } else {
      setEditingAddress(null);
      reset({
        label: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "México",
        recipient_name: "",
        phone: "",
      });
    }
    setShowForm(true);
    setShowMenu(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    reset();
  };

  const onSubmit = async (data: AddressFormValues) => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        alert("Error: No se encontró el perfil del usuario");
        return;
      }

      if (editingAddress) {
        await addressService.updateAddress(editingAddress.id, {
          label: data.label,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code || null,
          country: data.country,
          recipient_name: data.recipient_name || null,
          phone: data.phone || null,
        });
      } else {
        await addressService.createAddress({
          profile_id: profile.id,
          label: data.label,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code || null,
          country: data.country,
          recipient_name: data.recipient_name || null,
          phone: data.phone || null,
          is_default: addresses.length === 0,
        });
      }

      await refreshAddresses();
      handleCloseForm();
    } catch (error) {
      console.error("Error saving address:", error);
      alert("Error al guardar la dirección");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col pt-2 pb-24">
        <div className="flex items-center gap-3 mb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            Direcciones guardadas
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-2 pb-24">
      <div className="flex items-center gap-3 mb-4 bg-white dark:bg-gray-900 sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          Direcciones guardadas
        </h2>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-10 h-10 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No tienes direcciones guardadas
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            Agrega tu primera dirección para hacer pedidos más rápido
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-6">
          {addresses.map((address) => {
            const Icon = getIconForType(address.label || "");
            const isSelected = selectedAddress?.id === address.id || address.is_default;
            return (
              <div
                key={address.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-700"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon
                      className="w-6 h-6 text-amber-600 dark:text-amber-500"
                      strokeWidth={1.5}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {address.label}
                        </h3>
                        {address.is_default && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-2 py-0.5 rounded-full font-medium">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowMenu(
                              showMenu === address.id ? null : address.id,
                            )
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </button>
                        {showMenu === address.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                            <button
                              onClick={() => handleOpenForm(address)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {address.line1}
                      {address.line2 && `, ${address.line2}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {address.city}, {address.state} {address.postal_code}
                    </p>
                    {address.recipient_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {address.recipient_name}
                        {address.phone && ` • ${address.phone}`}
                      </p>
                    )}

                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="flex items-center gap-2 mt-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-amber-400 bg-amber-400"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && (
                          <Check
                            className="w-3 h-3 text-white"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                      <span>Usar esta dirección</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => handleOpenForm()}
        className="w-full bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-400 dark:hover:text-amber-500 transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>Agregar nueva dirección</span>
      </button>

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            Entrega más rápida.
          </span>{" "}
          Guarda tus direcciones frecuentes para hacer pedidos más rápido y
          recibir mejores estimaciones de tiempo.
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingAddress ? "Editar dirección" : "Nueva dirección"}
              </h3>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-6 pb-24 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Etiqueta
                </label>
                <input
                  type="text"
                  {...register("label")}
                  placeholder="Ej: Casa, Trabajo, Casa de mamá"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    formErrors.label
                      ? "border-red-300"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {formErrors.label && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.label.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Calle y número
                </label>
                <input
                  type="text"
                  {...register("line1")}
                  placeholder="Ej: Av. Insurgentes 123"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    formErrors.line1
                      ? "border-red-300"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {formErrors.line1 && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.line1.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Colonia / Referencia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("line2")}
                  placeholder="Ej: Col. Roma Norte, entre calles..."
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    formErrors.line2
                      ? "border-red-300"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {formErrors.line2 && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.line2.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    {...register("city")}
                    placeholder="Ej: CDMX"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                      formErrors.city
                        ? "border-red-300"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  {formErrors.city && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    {...register("state")}
                    placeholder="Ej: CDMX"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                      formErrors.state
                        ? "border-red-300"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  {formErrors.state && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.state.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código Postal (opcional)
                </label>
                <input
                  type="text"
                  {...register("postal_code")}
                  placeholder="Ej: 06700"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    formErrors.postal_code
                      ? "border-red-300"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {formErrors.postal_code && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.postal_code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del destinatario (opcional)
                </label>
                <input
                  type="text"
                  {...register("recipient_name")}
                  placeholder="Ej: Juan Pérez"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    formErrors.recipient_name
                      ? "border-red-300"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {formErrors.recipient_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.recipient_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  {...register("phone")}
                  placeholder="Ej: 5512345678"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    formErrors.phone
                      ? "border-red-300"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-500 mt-1">
                    {formErrors.phone.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                {/* isSubmitting (react-hook-form) se activa síncronamente en el
                    primer click, cubriendo la ventana antes de que setSaving se ejecute */}
                <button
                  type="submit"
                  disabled={saving || isSubmitting}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving || isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
