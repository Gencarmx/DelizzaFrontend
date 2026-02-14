import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Save, Loader2, Store, MapPin, Image as ImageIcon, Phone, Upload, X } from "lucide-react";
import { useNavigate } from "react-router";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { getBusinessById, updateBusiness, uploadBusinessLogo, deleteBusinessLogo } from "@core/services/businessService";

interface BusinessFormData {
  name: string;
  address: string;
  logo_url: string;
  phone_number: string;
}

export default function BusinessInfo() {
  const navigate = useNavigate();
  const { businessId } = useRestaurantNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessFormData>({
    name: "",
    address: "",
    logo_url: "",
    phone_number: "",
  });
  const [originalData, setOriginalData] = useState<BusinessFormData>({
    name: "",
    address: "",
    logo_url: "",
    phone_number: "",
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBusinessInfo();
  }, [businessId]);

  useEffect(() => {
    setImagePreview(businessData.logo_url);
  }, [businessData.logo_url]);

  const loadBusinessInfo = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const business = await getBusinessById(businessId);

      if (business) {
        const formData: BusinessFormData = {
          name: business.name || "",
          address: business.address || "",
          logo_url: business.logo_url || "",
          phone_number: business.phone || "",
        };
        setBusinessData(formData);
        setOriginalData(formData);
      }
    } catch (error) {
      console.error("Error loading business info:", error);
      alert("Error al cargar la información del negocio");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BusinessFormData, value: string | boolean) => {
    setBusinessData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    handleInputChange('logo_url', "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    setBusinessData(originalData);
    setSelectedFile(null);
    setImagePreview(originalData.logo_url);
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!businessId) {
      alert("No se pudo identificar el negocio");
      return;
    }

    if (!businessData.name.trim()) {
      alert("El nombre del restaurante es obligatorio");
      return;
    }

    setSaving(true);
    try {
      let logoUrl = businessData.logo_url;

      if (selectedFile) {
        setUploadingImage(true);
        try {
          if (originalData.logo_url) {
            await deleteBusinessLogo(originalData.logo_url);
          }

          logoUrl = await uploadBusinessLogo(businessId, selectedFile);
        } catch (error) {
          console.error("Error uploading logo:", error);
          alert("Error al subir la imagen. Por favor, intenta de nuevo.");
          setSaving(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const updates: Partial<{
        name: string;
        address: string;
        logo_url: string;
        phone: string;
      }> = {
        name: businessData.name.trim(),
      };

      if (businessData.address.trim()) {
        updates.address = businessData.address.trim();
      }

      if (logoUrl.trim()) {
        updates.logo_url = logoUrl.trim();
      }

      if (businessData.phone_number.trim()) {
        updates.phone = businessData.phone_number.trim();
      }

      await updateBusiness(businessId, updates);

      const updatedData = { ...businessData, logo_url: logoUrl };
      setBusinessData(updatedData);
      setOriginalData(updatedData);
      setSelectedFile(null);
      setIsEditing(false);
      alert("Información actualizada correctamente");
    } catch (error) {
      console.error("Error saving business info:", error);
      alert("Error al guardar la información del negocio");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      businessData.name !== originalData.name ||
      businessData.address !== originalData.address ||
      businessData.phone_number !== originalData.phone_number ||
      selectedFile !== null ||
      (businessData.logo_url !== originalData.logo_url && !selectedFile)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/restaurant/settings")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Información del negocio
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto pb-24 sm:pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del restaurante
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={businessData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Nombre del restaurante"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white text-lg">
                      {businessData.name || "Sin nombre"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dirección
                  </label>
                  {isEditing ? (
                    <textarea
                      value={businessData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      placeholder="Dirección del restaurante"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {businessData.address || "Sin dirección"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Teléfono del restaurante
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={businessData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="+52 999 999 9999"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {businessData.phone_number || "Sin teléfono"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logo del restaurante
                  </label>

                  {isEditing ? (
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview del logo"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                          />
                          <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>{imagePreview ? 'Cambiar imagen' : 'Subir imagen'}</span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {businessData.logo_url ? (
                        <img
                          src={businessData.logo_url}
                          alt="Logo del restaurante"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <div className="text-center">
                            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sin logo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges()}
                    className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{uploadingImage ? 'Subiendo imagen...' : 'Guardando...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Guardar cambios</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Editar información
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Nota:</strong> Los cambios en la información del negocio se reflejarán inmediatamente en la aplicación.
          </p>
        </div>
      </div>
    </div>
  );
}
