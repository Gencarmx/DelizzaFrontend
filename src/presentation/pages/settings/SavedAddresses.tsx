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
import { useState, useEffect } from "react";
import { useAuth } from "@core/context";
import { addressService, type Address } from "@core/services/addressService";
import { supabase } from "@core/supabase/client";

type AddressType = "home" | "work" | "other";

interface AddressFormData {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  recipient_name: string;
  phone: string;
}

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
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const data = await addressService.getAddressesByProfileId(profile.id);
        setAddresses(data);
        const defaultAddr = data.find((addr) => addr.is_default);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.id);
        }
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta dirección?")) {
      return;
    }

    try {
      await addressService.deleteAddress(id);
      setAddresses(addresses.filter((addr) => addr.id !== id));
      if (selectedAddress === id) {
        setSelectedAddress(null);
      }
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
        setAddresses(
          addresses.map((addr) => ({
            ...addr,
            is_default: addr.id === id,
          }))
        );
        setSelectedAddress(id);
      }
    } catch (error) {
      console.error("Error setting default address:", error);
      alert("Error al establecer dirección predeterminada");
    }
  };

  const handleOpenForm = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
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
      setFormData({
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
    setFormData({
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
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const updated = await addressService.updateAddress(editingAddress.id, {
          label: formData.label,
          line1: formData.line1,
          line2: formData.line2 || null,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code || null,
          country: formData.country,
          recipient_name: formData.recipient_name || null,
          phone: formData.phone || null,
        });
        setAddresses(
          addresses.map((addr) => (addr.id === updated.id ? updated : addr))
        );
      } else {
        const newAddress = await addressService.createAddress({
          profile_id: profile.id,
          label: formData.label,
          line1: formData.line1,
          line2: formData.line2 || null,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code || null,
          country: formData.country,
          recipient_name: formData.recipient_name || null,
          phone: formData.phone || null,
          is_default: addresses.length === 0,
        });
        setAddresses([newAddress, ...addresses]);
        if (addresses.length === 0) {
          setSelectedAddress(newAddress.id);
        }
      }

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
            const Icon = getIconForType(address.label);
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
                              showMenu === address.id ? null : address.id
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
                          selectedAddress === address.id
                            ? "border-amber-400 bg-amber-400"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {selectedAddress === address.id && (
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

            <form onSubmit={handleSaveAddress} className="p-6 pb-24 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Etiqueta
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                  placeholder="Ej: Casa, Trabajo, Casa de mamá"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Calle y número
                </label>
                <input
                  type="text"
                  value={formData.line1}
                  onChange={(e) =>
                    setFormData({ ...formData, line1: e.target.value })
                  }
                  placeholder="Ej: Av. Insurgentes 123"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Colonia / Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={formData.line2}
                  onChange={(e) =>
                    setFormData({ ...formData, line2: e.target.value })
                  }
                  placeholder="Ej: Col. Roma Norte, entre calles..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Ej: CDMX"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="Ej: CDMX"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Código Postal (opcional)
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  placeholder="Ej: 06700"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del destinatario (opcional)
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) =>
                    setFormData({ ...formData, recipient_name: e.target.value })
                  }
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Ej: 5512345678"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
